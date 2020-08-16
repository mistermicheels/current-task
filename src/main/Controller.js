/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("../types/DefaultWindowBoundsListener").DefaultWindowBoundsListener } DefaultWindowBoundsListener */
/** @typedef { import("../types/Integration").Integration} Integration */
/** @typedef { import("../types/InternalConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("../types/TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

/** @typedef {DefaultWindowBoundsListener & TrayMenuBackend} ImplementedInterfaces */

const { shell } = require("electron");
const moment = require("moment");

const AppState = require("./AppState");
const AppWindow = require("./AppWindow");
const ConditionMatcher = require("./ConditionMatcher");
const ConfigurationStore = require("./ConfigurationStore");
const ConfigurationValidator = require("./ConfigurationValidator");
const DisabledState = require("./DisabledState");
const TasksStateCalculator = require("./TasksStateCalculator");
const TrayMenu = require("./TrayMenu");
const Todoist = require("./integrations/Todoist");

const STATE_UPDATE_INTERVAL = 1000;
const TIME_BETWEEN_INTEGRATION_REFRESHES = 3 * 1000;
const TIME_BETWEEN_INTEGRATION_CLEANUPS = 10 * 60 * 1000;

/** @implements {ImplementedInterfaces} */
class Controller {
    async initialize() {
        const configurationValidator = new ConfigurationValidator();
        this._configurationStore = new ConfigurationStore(configurationValidator);
        await this._configurationStore.initialize();
        this._advancedConfiguration = this._configurationStore.loadAdvancedConfiguration();

        this._tasksStateCalculator = new TasksStateCalculator();
        this._tasksState = this._tasksStateCalculator.getPlaceholderTasksState();
        this._tasksStateErrorMessage = undefined;

        const now = moment();
        this._appState = new AppState(new ConditionMatcher(), this._advancedConfiguration);
        this._appState.updateFromTasksState(this._tasksState, now);
        const snapshot = this._appState.getSnapshot();

        const movingResizingEnabled = this._configurationStore.getMovingResizingEnabled();
        const existingDefaultWindowBounds = this._configurationStore.getDefaultWindowBounds();
        this._appWindow = new AppWindow(movingResizingEnabled, existingDefaultWindowBounds, this);
        this._appWindow.updateStatusAndMessage(snapshot.status, snapshot.message);
        this._appWindow.setNaggingMode(snapshot.naggingEnabled);
        this._appWindow.setHiddenMode(snapshot.downtimeEnabled);
        this._disabledState = new DisabledState();

        this._tray = new TrayMenu(
            this,
            {
                allowQuickDisable: !this._advancedConfiguration.requireReasonForDisabling,
                allowClosing: !this._advancedConfiguration.forbidClosingFromTray,
            },
            {
                integrationType: "manual",
                status: snapshot.status,
                message: snapshot.message,
                naggingEnabled: snapshot.naggingEnabled,
                downtimeEnabled: snapshot.downtimeEnabled,
                movingResizingEnabled: this._appWindow.isMovingResizingEnabled(),
                disabledUntil: this._disabledState.getDisabledUntil(),
                disabledReason: this._disabledState.getReason(),
            }
        );

        await this._setUpIntegration();

        setInterval(() => {
            const now = moment();
            this._disabledState.update(now);
            this._updateTrayFromDisabledState();
            this._updateAppState(now);
        }, STATE_UPDATE_INTERVAL);
    }

    _setUpIntegration() {
        const existingConfiguration = this._configurationStore.getIntegrationConfiguration();
        const integrationType = existingConfiguration ? existingConfiguration.type : "manual";
        this._setIntegrationType(integrationType);

        if (this._integrationClassInstance) {
            this._integrationClassInstance.configure(existingConfiguration);
        }

        this._refreshTasksStateFromIntegrationRepeated();
        this._performCleanupForIntegrationRepeated();
    }

    /** @param {IntegrationType} integrationType */
    _setIntegrationType(integrationType) {
        if (this._integrationType === integrationType) {
            return;
        }

        /** @type {IntegrationType} */
        this._integrationType = integrationType;

        /** @type {Integration} */
        this._integrationClassInstance = undefined;

        if (integrationType === "todoist") {
            this._integrationClassInstance = new Todoist();
        }

        this._tasksState = this._tasksStateCalculator.getPlaceholderTasksState();
        this._updateAppState(moment());
        this._tray.updateIntegrationType(integrationType);
    }

    async _refreshTasksStateFromIntegrationRepeated() {
        await this._refreshTasksStateFromIntegration();

        setTimeout(
            () => this._refreshTasksStateFromIntegrationRepeated(),
            TIME_BETWEEN_INTEGRATION_REFRESHES
        );
    }

    async _performCleanupForIntegrationRepeated() {
        await this._performCleanupForIntegration();

        setTimeout(
            () => this._performCleanupForIntegrationRepeated(),
            TIME_BETWEEN_INTEGRATION_CLEANUPS
        );
    }

    async _refreshTasksStateFromIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        const now = moment();

        try {
            this._tasksState = this._tasksStateCalculator.calculateTasksState(
                await this._integrationClassInstance.getRelevantTasksForState(),
                now
            );

            this._tasksStateErrorMessage = undefined;
        } catch (error) {
            this._tasksState = undefined;
            this._tasksStateErrorMessage = error.message;
        }
    }

    async _performCleanupForIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        try {
            await this._integrationClassInstance.performCleanup();
        } catch (error) {
            // this is just periodic cleanup, we don't care too much if it fails, don't update app state
            console.log(`Failed to perform cleanup for current integration: ${error.message}`);
        }
    }

    _updateAppState(now) {
        if (this._tasksState) {
            this._appState.updateFromTasksState(this._tasksState, now);
        } else {
            this._appState.updateFromTaskStateError(this._tasksStateErrorMessage, now);
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

    /** @param {Rectangle} bounds */
    onDefaultWindowBoundsChanged(bounds) {
        this._configurationStore.setDefaultWindowBounds(bounds);
    }

    /** @param {IntegrationType} integrationType */
    changeIntegrationType(integrationType) {
        this._setIntegrationType(integrationType);
        this._configurationStore.setIntegrationConfiguration({ type: integrationType });
    }

    async setManualCurrentTask() {
        if (this._integrationType !== "manual") {
            return;
        }

        const dialogResult = await this._appWindow.openInputDialogAndGetResult({
            fields: [
                {
                    type: "text",
                    name: "currentTaskTitle",
                    label: "Current task",
                    placeholder: "Enter the task title here",
                    required: true,
                    currentValue: this._tasksState.currentTaskTitle,
                },
            ],
            submitButtonName: "Set as current task",
        });

        if (dialogResult) {
            const currentTaskTitle = dialogResult.currentTaskTitle;
            this._tasksState = this._tasksStateCalculator.getManualTasksState(currentTaskTitle);
            this._updateAppState(moment());
        }
    }

    removeManualCurrentTask() {
        if (this._integrationType !== "manual") {
            return;
        }

        this._tasksState = this._tasksStateCalculator.getManualTasksState("");
        this._updateAppState(moment());
    }

    async configureIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        const dialogFields = this._integrationClassInstance.getConfigurationInputDialogFields();

        const dialogResult = await this._appWindow.openInputDialogAndGetResult({
            fields: dialogFields,
            submitButtonName: "Save configuration",
        });

        if (dialogResult) {
            const configuration = {
                type: this._integrationType,
                ...dialogResult,
            };

            this._integrationClassInstance.configure(configuration);
            this._configurationStore.setIntegrationConfiguration(configuration);
        }
    }

    refreshFromIntegration() {
        this._refreshTasksStateFromIntegration();
    }

    showFullState() {
        const snapshot = this._appState.getSnapshot();
        const formattedJSon = JSON.stringify(snapshot, undefined, 4);
        this._appWindow.showInfoModal(formattedJSon);
    }

    showAdvancedConfigFile() {
        const configFilePath = this._configurationStore.getAdvancedConfigurationFilePath();
        shell.showItemInFolder(configFilePath);
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
        this._disabledState.disableAppForMinutes(minutes, moment());
        this._disableAppWindow();
        this._updateTrayFromDisabledState();
    }

    _updateTrayFromDisabledState() {
        const disabledUntil = this._disabledState.getDisabledUntil();
        const disabledReason = this._disabledState.getReason();
        this._tray.updateDisabledState(disabledUntil, disabledReason);
    }

    async disableUntilSpecificTime() {
        const dialogResult = await this._appWindow.openInputDialogAndGetResult({
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

        if (dialogResult) {
            this._disabledState.disableAppUntil(
                dialogResult.disableUntil,
                moment(),
                dialogResult.reason
            );

            this._disableAppWindow();
            this._updateTrayFromDisabledState();
        }
    }

    _disableAppWindow() {
        this._appWindow.setNaggingMode(false);
        this._appWindow.setHiddenMode(true);
        this._tray.updateWindowAppearance(false, true);
    }

    enable() {
        this._disabledState.enableApp();
        this._updateTrayFromDisabledState();
    }

    notifyTrayMenuOpened() {
        this._appWindow.notifyTrayMenuOpened();
    }

    notifyTrayMenuClosed() {
        this._appWindow.notifyTrayMenuClosed();
    }
}

module.exports = Controller;
