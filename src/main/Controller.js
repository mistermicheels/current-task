/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("./Logger") } Logger */
/** @typedef { import("../types/DefaultWindowBoundsListener").DefaultWindowBoundsListener } DefaultWindowBoundsListener */
/** @typedef { import("../types/InternalConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("../types/TasksStateProviderListener").TasksStateProviderListener} TasksStateListener */
/** @typedef { import("../types/TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

/** @typedef {TasksStateListener & DefaultWindowBoundsListener & TrayMenuBackend} ImplementedInterfaces */

const { dialog, shell } = require("electron");
const moment = require("moment");

const AppState = require("./AppState");
const ConditionMatcher = require("./ConditionMatcher");
const ConfigurationStore = require("./ConfigurationStore");
const ConfigurationValidator = require("./ConfigurationValidator");
const DisabledState = require("./DisabledState");
const TasksStateCalculator = require("./TasksStateCalculator");
const TasksStateProvider = require("./TasksStateProvider");
const TrayMenu = require("./TrayMenu");
const AboutWindow = require("./windows/AboutWindow");
const AppWindow = require("./windows/AppWindow");
const DialogWindowService = require("./windows/DialogWindowService");

const STATE_UPDATE_INTERVAL = 1000;

/** @implements {ImplementedInterfaces} */
class Controller {
    /** @param {Logger} logger */
    constructor(logger) {
        this._logger = logger;
    }

    async initialize() {
        const configurationValidator = new ConfigurationValidator();
        this._configurationStore = new ConfigurationStore(configurationValidator, this._logger);
        await this._configurationStore.initialize();
        this._advancedConfiguration = this._configurationStore.loadAdvancedConfiguration();

        const tasksStateCalculator = new TasksStateCalculator();
        const now = moment();
        this._appState = new AppState(new ConditionMatcher(), this._advancedConfiguration);
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

        this._disabledState = new DisabledState();

        this._tray = new TrayMenu(
            this,
            {
                allowQuickDisable: !this._advancedConfiguration.requireReasonForDisabling,
                allowClosing: !this._advancedConfiguration.forbidClosingFromTray,
            },
            {
                integrationType: this._tasksStateProvider.getIntegrationType(),
                status: snapshot.status,
                message: snapshot.message,
                naggingEnabled: snapshot.naggingEnabled,
                downtimeEnabled: snapshot.downtimeEnabled,
                detailedLoggingEnabed: this._logger.isDetailedLoggingEnabled(),
                movingResizingEnabled: this._appWindow.isMovingResizingEnabled(),
                disabledUntil: this._disabledState.getDisabledUntil(),
                disabledReason: this._disabledState.getReason(),
            }
        );

        setInterval(() => {
            const now = moment();
            this._disabledState.update(now);
            this._updateTrayFromDisabledState();
            this._updateAppState(now);
        }, STATE_UPDATE_INTERVAL);
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

        if (!this._disabledState.isAppDisabled()) {
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
        const formattedJSon = JSON.stringify(snapshot, undefined, 4);
        const browserWindow = this._appWindow.getBrowserWindow();
        dialog.showMessageBox(browserWindow, { type: "info", message: formattedJSon });
    }

    showAdvancedConfigFile() {
        const configFilePath = this._configurationStore.getAdvancedConfigurationFilePath();
        shell.showItemInFolder(configFilePath);
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
        this._logger.info("Resetting app window position and size");
        this._appWindow.resetPositionAndSize();
    }

    /** @param {number} minutes */
    disableForMinutes(minutes) {
        if (this._disabledState.isAppDisabled()) {
            return;
        }

        this._disabledState.disableAppForMinutes(minutes, moment());
        this._disableAppWindow();
        this._updateTrayFromDisabledState();
        this._logger.info(`Disabled app for ${minutes} minutes`);
    }

    _updateTrayFromDisabledState() {
        const disabledUntil = this._disabledState.getDisabledUntil();
        const disabledReason = this._disabledState.getReason();
        this._tray.updateDisabledState(disabledUntil, disabledReason);
    }

    async disableUntilSpecificTime() {
        if (this._disabledState.isAppDisabled()) {
            return;
        }

        const dialogResult = await this._dialogWindowService.openDialogAndGetResult({
            fields: [
                {
                    type: "text",
                    name: "disableUntil",
                    label: "Disable until",
                    placeholder: "HH:mm",
                    required: true,
                    pattern: "([0-1][0-9]|2[0-3]):[0-5][0-9]",
                },
                {
                    type: "text",
                    name: "reason",
                    label: "Reason",
                    placeholder: "The reason for disabling",
                    required: !!this._advancedConfiguration.requireReasonForDisabling,
                },
            ],
            submitButtonName: "Disable",
        });

        if (!dialogResult) {
            return;
        }

        const now = moment();
        this._disabledState.disableAppUntil(dialogResult.disableUntil, now, dialogResult.reason);
        const differenceHours = this._disabledState.getDisabledUntil().diff(now, "hours");

        if (differenceHours >= 2) {
            const confirmationResult = await this._dialogWindowService.openDialogAndGetResult({
                message: `You are about to disable the app for more than ${differenceHours} hours, are you sure?`,
                submitButtonName: "Disable",
            });

            if (!confirmationResult) {
                this._disabledState.enableApp();
                return;
            }
        }

        this._disableAppWindow();
        this._updateTrayFromDisabledState();
        this._logger.info(`Disabled app until ${this._disabledState.getDisabledUntil().format()}`);
    }

    _disableAppWindow() {
        this._appWindow.setNaggingMode(false);
        this._appWindow.setHiddenMode(true);
        this._tray.updateWindowAppearance(false, true);
    }

    enable() {
        this._disabledState.enableApp();
        this._updateTrayFromDisabledState();
        this._logger.info("Enabled app");
    }

    notifyTrayMenuOpened() {
        this._appWindow.notifyTrayMenuOpened();
    }

    notifyTrayMenuClosed() {
        this._appWindow.notifyTrayMenuClosed();
    }
}

module.exports = Controller;
