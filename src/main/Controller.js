/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("./configuration/IntegrationConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("./tasks/TasksTrackerListener").TasksTrackerListener} TasksTrackerListener */
/** @typedef { import("./windows/DefaultWindowBoundsListener").DefaultWindowBoundsListener } DefaultWindowBoundsListener */
/** @typedef { import("./Logger") } Logger */
/** @typedef { import("./TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

/** @typedef {TasksTrackerListener & DefaultWindowBoundsListener & TrayMenuBackend} ImplementedInterfaces */

const { dialog, shell, app } = require("electron");
const moment = require("moment");

const CalculatedState = require("./calculated-state/CalculatedState");
const CalendarEventsTracker = require("./calendar-events/CalendarEventsTracker");
const ConfigurationStore = require("./configuration/ConfigurationStore");
const TasksSummaryCalculator = require("./tasks/TasksSummaryCalculator");
const TasksTracker = require("./tasks/TasksTracker");
const AboutWindow = require("./windows/AboutWindow");
const AppWindow = require("./windows/AppWindow");
const DialogWindowService = require("./windows/DialogWindowService");
const DisabledState = require("./DisabledState");
const IdleTimeTracker = require("./IdleTimeTracker");
const TrayMenu = require("./TrayMenu");

const STATE_UPDATE_INTERVAL = 1000;
const SLEEP_DETECTION_THRESHOLD_SECONDS = 60;

/** @implements {ImplementedInterfaces} */
class Controller {
    /** @param {Logger} logger */
    constructor(logger) {
        this._logger = logger;
    }

    async initialize() {
        this._configurationStore = new ConfigurationStore(this._logger);
        await this._configurationStore.initialize();
        this._advancedConfiguration = this._configurationStore.loadAdvancedConfiguration();

        const now = moment();
        const tasksSummaryCalculator = new TasksSummaryCalculator();
        this._calculatedState = new CalculatedState(this._advancedConfiguration, this._logger, now);

        this._calculatedState.updateFromTasksSummaryAndActiveEvents(
            tasksSummaryCalculator.getPlaceholderTasksSummary(),
            [],
            now
        );

        const snapshot = this._calculatedState.getSnapshot();

        const movingResizingEnabled = !!this._configurationStore.getMovingResizingEnabled();
        const existingDefaultWindowBounds = this._configurationStore.getDefaultWindowBounds();

        this._appWindow = new AppWindow(
            movingResizingEnabled,
            existingDefaultWindowBounds,
            this,
            this._logger
        );

        this._appWindow.updateStatusAndMessage(snapshot.status, snapshot.message);
        this._appWindow.setNaggingMode(snapshot.naggingEnabled);
        this._appWindow.setHiddenMode(snapshot.downtimeEnabled);

        this._aboutWindow = new AboutWindow(this._appWindow.getBrowserWindow());
        this._dialogWindowService = new DialogWindowService(this._appWindow.getBrowserWindow());

        this._tasksTracker = new TasksTracker(
            this._configurationStore.getIntegrationConfiguration(),
            tasksSummaryCalculator,
            this,
            this._dialogWindowService,
            this._logger
        );

        this._calendarEventsTracker = new CalendarEventsTracker(
            this._advancedConfiguration.calendarUrl,
            this._logger
        );

        this._disabledState = new DisabledState(
            !!this._advancedConfiguration.requireReasonForDisabling,
            this._dialogWindowService,
            this._logger
        );

        const trayOptions = this._getTrayOptions();

        this._tray = new TrayMenu(this, trayOptions, {
            integrationType: this._tasksTracker.getIntegrationType(),
            detailedStateCalculationLoggingEnabled: this._logger.isDetailedStateCalculationLoggingEnabled(),
            detailedIntegrationLoggingEnabled: this._logger.isDetailedIntegrationLoggingEnabled(),
            movingResizingEnabled: this._appWindow.isMovingResizingEnabled(),
            disabledUntil: this._disabledState.getDisabledUntil(),
            disabledReason: this._disabledState.getReason(),
        });

        this._idleTimeTracker = new IdleTimeTracker(SLEEP_DETECTION_THRESHOLD_SECONDS, now);

        this._updateStateIntervalId = setInterval(() => this._updateState(), STATE_UPDATE_INTERVAL);
    }

    _getTrayOptions() {
        return {
            allowQuickDisable:
                !this._advancedConfiguration.forbidDisabling &&
                !this._advancedConfiguration.requireReasonForDisabling,
            allowDisableUntilSpecificTime: !this._advancedConfiguration.forbidDisabling,
            allowClosing: !this._advancedConfiguration.forbidClosingFromTray,
            showRefreshCalendar: !!this._advancedConfiguration.calendarUrl,
        };
    }

    _updateState() {
        const now = moment();
        this._updateDisabledState(now);
        this._checkIdleTime(now);
        this._updateCalculatedState(now);
        this._triggerBehaviorFromDisabledOrDowntimeMode(now);
    }

    _updateDisabledState(now) {
        const wasDisabled = this._disabledState.isAppDisabled();
        this._disabledState.update(now);
        const isDisabled = this._disabledState.isAppDisabled();

        if (wasDisabled && !isDisabled) {
            this._updateTrayFromDisabledState();
        }
    }

    _updateTrayFromDisabledState() {
        const disabledUntil = this._disabledState.getDisabledUntil();
        const disabledReason = this._disabledState.getReason();
        this._tray.updateDisabledState(disabledUntil, disabledReason);
    }

    _checkIdleTime(now) {
        this._idleTimeTracker.update(now);

        if (this._idleTimeTracker.wasAsleepBeforeLastUpdate()) {
            this._calculatedState.resetStatusTimers(now);
        }

        const idleSeconds = this._idleTimeTracker.getIdleSeconds();

        const {
            resetStateTimersIfSystemIdleForSeconds: resetTimersThreshold,
            clearCurrentIfSystemIdleForSeconds: clearCurrentThreshold,
        } = this._advancedConfiguration;

        if (resetTimersThreshold && idleSeconds >= resetTimersThreshold) {
            this._calculatedState.resetStatusTimers(now);
        }

        if (clearCurrentThreshold && idleSeconds >= clearCurrentThreshold) {
            this._tasksTracker.clearCurrent();
        }
    }

    _updateCalculatedState(now) {
        const tasksSummary = this._tasksTracker.getTasksSummary(now);
        const activeEvents = this._calendarEventsTracker.getActiveCalendarEvents(now);

        const errorMessage =
            this._tasksTracker.getTasksErrorMessage() ||
            this._calendarEventsTracker.getCalendarErrorMessage();

        if (errorMessage) {
            this._calculatedState.updateFromTasksOrEventsError(tasksSummary, errorMessage, now);
        } else {
            this._calculatedState.updateFromTasksSummaryAndActiveEvents(
                tasksSummary,
                activeEvents,
                now
            );
        }

        const snapshot = this._calculatedState.getSnapshot();
        this._appWindow.updateStatusAndMessage(snapshot.status, snapshot.message);

        if (snapshot.customStateShouldClearCurrent) {
            this._tasksTracker.clearCurrent();
        }

        if (this._disabledState.isAppDisabled()) {
            this._logger.debugStateCalculation(
                "Ignoring nagging, blinking and downtime because app is disabled"
            );
        } else {
            this._appWindow.setNaggingMode(snapshot.naggingEnabled);
            this._appWindow.setBlinkingMode(snapshot.blinkingEnabled);
            this._appWindow.setHiddenMode(snapshot.downtimeEnabled);
        }
    }

    _triggerBehaviorFromDisabledOrDowntimeMode(now) {
        const disabledOrDowntimeEnabled =
            this._disabledState.isAppDisabled() ||
            this._calculatedState.getSnapshot().downtimeEnabled;

        if (disabledOrDowntimeEnabled) {
            this._calculatedState.resetStatusTimers(now);

            if (this._advancedConfiguration.clearCurrentIfDisabled) {
                this._tasksTracker.clearCurrent();
            }
        }
    }

    // TasksTrackerListener

    onManualTaskChanged() {
        this._updateCalculatedState(moment());
    }

    onIntegrationTypeChanged() {
        this._updateCalculatedState(moment());
        this._tray.updateIntegrationType(this._tasksTracker.getIntegrationType());
    }

    onIntegrationConfigurationChanged(configuration) {
        this._configurationStore.setIntegrationConfiguration(configuration);
    }

    // DefaultWindowBoundsListener

    /** @param {Rectangle} bounds */
    onDefaultWindowBoundsChanged(bounds) {
        this._configurationStore.setDefaultWindowBounds(bounds);
    }

    // TrayMenuBackend

    showAbout() {
        this._aboutWindow.show();
    }

    /** @param {IntegrationType} integrationType */
    changeIntegrationType(integrationType) {
        this._tasksTracker.changeIntegrationType(integrationType);
    }

    setManualCurrentTask() {
        this._tasksTracker.setManualCurrentTask();
    }

    removeManualCurrentTask() {
        this._tasksTracker.removeManualCurrentTask();
    }

    configureIntegration() {
        this._tasksTracker.configureIntegration();
    }

    refreshCalendar() {
        this._calendarEventsTracker.refreshFromCalendar();
    }

    showCalculatedState() {
        const snapshot = this._calculatedState.getSnapshot();
        const lines = [];

        for (const [name, value] of Object.entries(snapshot)) {
            if (name === "activeCalendarEvents") {
                lines.push(`${name}: ${JSON.stringify(value)}`);
            } else if (typeof value === "string") {
                lines.push(`${name}: "${value}"`);
            } else {
                lines.push(`${name}: ${value}`);
            }
        }

        const message = lines.join("\n");

        this._dialogWindowService.openDialogAndGetResult({
            message,
            submitButtonName: "OK",
            hideCancelButton: true,
        });
    }

    showAdvancedConfigFile() {
        const configFilePath = this._configurationStore.getAdvancedConfigurationFilePath();
        shell.showItemInFolder(configFilePath);
    }

    reloadAdvancedConfigFile() {
        this._logger.info("Reloading advanced configuration file");

        try {
            this._advancedConfiguration = this._configurationStore.loadAdvancedConfiguration();
        } catch (error) {
            // browser window is needed for the dialog to be async
            // see https://github.com/electron/electron/issues/23319
            // see https://github.com/electron/electron/issues/17801
            const browserWindow = this._appWindow.getBrowserWindow();
            dialog.showMessageBox(browserWindow, { type: "error", message: error.message });
            return;
        }

        this._calculatedState.updateConfiguration(this._advancedConfiguration);
        this._calendarEventsTracker.updateCalendarUrl(this._advancedConfiguration.calendarUrl);
        const requireReasonForDisabling = !!this._advancedConfiguration.requireReasonForDisabling;
        this._disabledState.updateRequireReasonForDisabling(requireReasonForDisabling);
        this._tray.updateOptions(this._getTrayOptions());
    }

    showLogFile() {
        const logFilePath = this._logger.getLogFilePath();
        shell.showItemInFolder(logFilePath);
    }

    toggleDetailedStateCalculationLoggingEnabled() {
        this._logger.toggleDetailedStateCalculationLoggingEnabled();
        const isEnabled = this._logger.isDetailedStateCalculationLoggingEnabled();
        this._tray.updateDetailedStateCalculationLoggingEnabled(isEnabled);
    }

    toggleDetailedIntegrationLoggingEnabled() {
        this._logger.toggleDetailedIntegrationLoggingEnabled();
        const isEnabled = this._logger.isDetailedIntegrationLoggingEnabled();
        this._tray.updateDetailedIntegrationLoggingEnabled(isEnabled);
    }

    toggleMovingResizingEnabled() {
        this._appWindow.toggleMovingResizingEnabled();
        const movingResizingEnabled = this._appWindow.isMovingResizingEnabled();
        this._tray.updateMovingResizingEnabled(movingResizingEnabled);
        this._configurationStore.setMovingResizingEnabled(movingResizingEnabled);
    }

    resetPositionAndSize() {
        this._appWindow.resetPositionAndSize();
    }

    /** @param {number} minutes */
    disableForMinutes(minutes) {
        const now = moment();
        this._disabledState.disableAppForMinutes(minutes, now);
        this._disableAppWindow();
        this._updateTrayFromDisabledState();
        this._triggerBehaviorFromDisabledOrDowntimeMode(now);
    }

    _disableAppWindow() {
        this._appWindow.setNaggingMode(false);
        this._appWindow.setBlinkingMode(false);
        this._appWindow.setHiddenMode(true);
    }

    async disableUntilSpecificTime() {
        await this._disabledState.disableAppUntilSpecificTime();

        if (this._disabledState.isAppDisabled()) {
            this._disableAppWindow();
            this._updateTrayFromDisabledState();
            const now = moment();
            this._triggerBehaviorFromDisabledOrDowntimeMode(now);
        }
    }

    enable() {
        this._disabledState.enableApp();
        this._updateTrayFromDisabledState();
    }

    close() {
        this._logger.info("Closing application");

        // manually take control of the quitting process
        // this way, we don't have to constantly check whether Electron has automatically destroyed a window
        clearInterval(this._updateStateIntervalId);
        this._appWindow.destroy();
        this._aboutWindow.destroy();
        this._dialogWindowService.destroy();
        this._tray.destroy();

        // destroys all open windows, but all windows are already destroyed by now
        app.quit();
    }

    notifyTrayMenuOpened() {
        this._appWindow.notifyTrayMenuOpened();
    }

    notifyTrayMenuClosed() {
        this._appWindow.notifyTrayMenuClosed();
    }
}

module.exports = Controller;
