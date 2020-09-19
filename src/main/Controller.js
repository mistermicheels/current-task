/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("./configuration/IntegrationConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("./tasks-state/TasksStateProviderListener").TasksStateProviderListener} TasksStateListener */
/** @typedef { import("./windows/DefaultWindowBoundsListener").DefaultWindowBoundsListener } DefaultWindowBoundsListener */
/** @typedef { import("./Logger") } Logger */
/** @typedef { import("./TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

/** @typedef {TasksStateListener & DefaultWindowBoundsListener & TrayMenuBackend} ImplementedInterfaces */

const { dialog, shell, app } = require("electron");
const moment = require("moment");

const AppState = require("./app-state/AppState");
const ConditionMatcher = require("./app-state/ConditionMatcher");
const ConfigurationStore = require("./configuration/ConfigurationStore");
const TasksStateCalculator = require("./tasks-state/TasksStateCalculator");
const TasksStateProvider = require("./tasks-state/TasksStateProvider");
const AboutWindow = require("./windows/AboutWindow");
const AppWindow = require("./windows/AppWindow");
const DialogWindowService = require("./windows/DialogWindowService");
const DisabledState = require("./DisabledState");
const TrayMenu = require("./TrayMenu");

const STATE_UPDATE_INTERVAL = 1000;

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
        const matcher = new ConditionMatcher();
        const tasksStateCalculator = new TasksStateCalculator();
        this._appState = new AppState(matcher, this._advancedConfiguration, this._logger, now);
        this._appState.updateFromTasksState(tasksStateCalculator.getPlaceholderTasksState(), now);
        const snapshot = this._appState.getSnapshot();

        const movingResizingEnabled = this._configurationStore.getMovingResizingEnabled();
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

        this._tasksStateProvider = new TasksStateProvider(
            this._configurationStore.getIntegrationConfiguration(),
            tasksStateCalculator,
            this,
            this._dialogWindowService,
            this._logger
        );

        this._disabledState = new DisabledState(
            !!this._advancedConfiguration.requireReasonForDisabling,
            this._dialogWindowService,
            this._logger
        );

        const trayOptions = this._getTrayOptions();

        this._tray = new TrayMenu(this, trayOptions, {
            integrationType: this._tasksStateProvider.getIntegrationType(),
            status: snapshot.status,
            message: snapshot.message,
            naggingEnabled: snapshot.naggingEnabled,
            downtimeEnabled: snapshot.downtimeEnabled,
            detailedLoggingEnabled: this._logger.isDetailedLoggingEnabled(),
            movingResizingEnabled: this._appWindow.isMovingResizingEnabled(),
            disabledUntil: this._disabledState.getDisabledUntil(),
            disabledReason: this._disabledState.getReason(),
        });

        this._updateStateIntervalId = setInterval(() => this._updateState(), STATE_UPDATE_INTERVAL);
    }

    _getTrayOptions() {
        return {
            allowQuickDisable: !this._advancedConfiguration.requireReasonForDisabling,
            allowClosing: !this._advancedConfiguration.forbidClosingFromTray,
        };
    }

    _updateState() {
        const now = moment();
        this._updateDisabledState(now);
        this._updateAppState(now);
    }

    _updateDisabledState(now) {
        const wasDisabled = this._disabledState.isAppDisabled();
        this._disabledState.update(now);

        if (wasDisabled && !this._disabledState.isAppDisabled()) {
            this._appState.resetStatusTimers(now);
            this._updateTrayFromDisabledState();
        }
    }

    _updateTrayFromDisabledState() {
        const disabledUntil = this._disabledState.getDisabledUntil();
        const disabledReason = this._disabledState.getReason();
        this._tray.updateDisabledState(disabledUntil, disabledReason);
    }

    _updateAppState(now) {
        const tasksState = this._tasksStateProvider.getTasksState(now);
        const errorMessage = this._tasksStateProvider.getTasksStateErrorMessage();

        if (errorMessage) {
            this._appState.updateFromTasksStateError(tasksState, errorMessage, now);
        } else {
            this._appState.updateFromTasksState(tasksState, now);
        }

        const snapshot = this._appState.getSnapshot();
        this._appWindow.updateStatusAndMessage(snapshot.status, snapshot.message);
        this._tray.updateStatusAndMessage(snapshot.status, snapshot.message);

        if (this._disabledState.isAppDisabled()) {
            this._logger.debug("Ignoring nagging and downtime because app is disabled");
        } else {
            this._appWindow.setNaggingMode(snapshot.naggingEnabled);
            this._appWindow.setHiddenMode(snapshot.downtimeEnabled);
            this._tray.updateWindowAppearance(snapshot.naggingEnabled, snapshot.downtimeEnabled);
        }
    }

    // TasksStateListener

    onManualTasksStateChanged() {
        this._updateAppState(moment());
    }

    onIntegrationTypeChanged() {
        this._updateAppState(moment());
        this._tray.updateIntegrationType(this._tasksStateProvider.getIntegrationType());
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
        this._tasksStateProvider.changeIntegrationType(integrationType);
    }

    setManualCurrentTask() {
        this._tasksStateProvider.setManualCurrentTask();
    }

    removeManualCurrentTask() {
        this._tasksStateProvider.removeManualCurrentTask();
    }

    configureIntegration() {
        this._tasksStateProvider.configureIntegration();
    }

    showFullState() {
        const snapshot = this._appState.getSnapshot();
        const lines = [];

        for (const [name, value] of Object.entries(snapshot)) {
            if (typeof value === "string") {
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
        try {
            this._advancedConfiguration = this._configurationStore.loadAdvancedConfiguration();
        } catch (error) {
            dialog.showMessageBoxSync({ type: "error", message: error.message });
            return;
        }

        this._appState.updateConfiguration(this._advancedConfiguration);
        const requireReasonForDisabling = !!this._advancedConfiguration.requireReasonForDisabling;
        this._disabledState.updateRequireReasonForDisabling(requireReasonForDisabling);
        this._tray.updateOptions(this._getTrayOptions());
    }

    showLogFile() {
        const logFilePath = this._logger.getLogFilePath();
        shell.showItemInFolder(logFilePath);
    }

    toggleDetailedLoggingEnabled() {
        if (this._logger.isDetailedLoggingEnabled()) {
            this._logger.disableDetailedLogging();
        } else {
            this._logger.enableDetailedLogging();
        }

        this._tray.updateDetailedLoggingEnabled(this._logger.isDetailedLoggingEnabled());
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
    }

    _disableAppWindow() {
        const enableNaggingMode = false;
        const enableHiddenMode = true;
        this._appWindow.setNaggingMode(enableNaggingMode);
        this._appWindow.setHiddenMode(enableHiddenMode);
        this._tray.updateWindowAppearance(enableNaggingMode, enableHiddenMode);
    }

    async disableUntilSpecificTime() {
        const now = moment();
        await this._disabledState.disableAppUntilSpecificTime(now);

        if (this._disabledState.isAppDisabled()) {
            this._disableAppWindow();
            this._updateTrayFromDisabledState();
        }
    }

    enable() {
        this._disabledState.enableApp();
        this._appState.resetStatusTimers(moment());
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
