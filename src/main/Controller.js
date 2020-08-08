//@ts-check

/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("./types/DefaultWindowBoundsListener").DefaultWindowBoundsListener } DefaultWindowBoundsListener */
/** @typedef { import("./types/InternalConfiguration").TodoistConfiguration} TodoistConfiguration */
/** @typedef { import("./types/TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

/** @typedef {DefaultWindowBoundsListener & TrayMenuBackend} ImplementedInterfaces */

const { shell } = require("electron");
const moment = require("moment");

const AppState = require("./AppState");
const AppWindow = require("./AppWindow");
const ConditionMatcher = require("./ConditionMatcher");
const ConfigurationStore = require("./ConfigurationStore");
const DisabledState = require("./DisabledState");
const TasksStateCalculator = require("./TasksStateCalculator");
const TrayMenu = require("./TrayMenu");
const Todoist = require("./integrations/Todoist");

const TIME_BETWEEN_INTEGRATION_REFRESHES = 3 * 1000;
const TIME_BETWEEN_INTEGRATION_CLEANUPS = 10 * 60 * 1000;

const WINDOW_CONDITIONS_CHECK_INTERVAL = 1000;

/** @implements {ImplementedInterfaces} */
class Controller {
    async initialize() {
        this._configurationStore = new ConfigurationStore();
        this._advancedConfiguration = this._configurationStore.loadAdvancedConfiguration();

        this._conditionMatcher = new ConditionMatcher();
        this._tasksStateCalculator = new TasksStateCalculator();
        this._tasksState = this._tasksStateCalculator.getPlaceholderTasksState();
        this._tasksStateErrorMessage = undefined;
        const customStateRules = this._advancedConfiguration.customStateRules;

        this._appState = new AppState(
            this._conditionMatcher,
            customStateRules,
            this._tasksState,
            moment()
        );

        const existingDefaultWindowBounds = this._configurationStore.getDefaultWindowBounds();
        this._appWindow = new AppWindow(existingDefaultWindowBounds, this);
        this._disabledState = new DisabledState();

        await this._setUpIntegration();

        const stateSnapshot = this._appState.getSnapshot(moment());

        this._tray = new TrayMenu(
            this,
            {
                allowQuickDisable: !this._advancedConfiguration.requireReasonForDisabling,
                allowClosing: !this._advancedConfiguration.forbidClosingFromTray,
            },
            {
                status: stateSnapshot.status,
                message: stateSnapshot.message,
                naggingEnabled: false,
                downtimeEnabled: false,
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
        }, WINDOW_CONDITIONS_CHECK_INTERVAL);
    }

    async _setUpIntegration() {
        this._todoist = new Todoist();

        const existingConfiguration = this._configurationStore.getIntegrationConfiguration();

        if (existingConfiguration) {
            this._todoist.configure(existingConfiguration);
        }

        this._refreshTasksStateFromIntegrationRepeated();
        this._performCleanupForIntegrationRepeated();
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
        try {
            this._tasksState = this._tasksStateCalculator.calculateTasksState(
                await this._todoist.getRelevantTasksForState(),
                moment()
            );

            this._tasksStateErrorMessage = undefined;
        } catch (error) {
            this._tasksState = undefined;
            this._tasksStateErrorMessage = error.message;
        }
    }

    async _performCleanupForIntegration() {
        try {
            await this._todoist.performCleanup();
        } catch (error) {
            // this is just periodic cleanup, we don't care too much if it fails, don't update app state
            console.log(`Failed to perform cleanup for current integration: ${error.message}`);
        }
    }

    _updateAppState(now) {
        if (this._tasksState) {
            this._appState.updateFromTasksState(this._tasksState, now);
        } else {
            this._appState.updateStatusAndMessage("error", this._tasksStateErrorMessage);
        }

        const newStateSnapshot = this._appState.getSnapshot(now);
        this._appWindow.updateStatusAndMessage(newStateSnapshot.status, newStateSnapshot.message);
        this._tray.updateStatusAndMessage(newStateSnapshot.status, newStateSnapshot.message);
        this._updateWindowAppearance(newStateSnapshot);
    }

    _updateWindowAppearance(stateSnapshot) {
        if (this._disabledState.isAppDisabled()) {
            return;
        }

        let downtimeEnabled = false;
        const downtimeConditions = this._advancedConfiguration.downtimeConditions;

        if (downtimeConditions) {
            downtimeEnabled = downtimeConditions.some((condition) =>
                this._conditionMatcher.match(condition, stateSnapshot)
            );
        }

        let naggingEnabled = false;
        const naggingConditions = this._advancedConfiguration.naggingConditions;

        if (!downtimeEnabled && naggingConditions) {
            naggingEnabled = naggingConditions.some((condition) =>
                this._conditionMatcher.match(condition, stateSnapshot)
            );
        }

        this._appWindow.setNaggingMode(naggingEnabled);
        this._appWindow.setHiddenMode(downtimeEnabled);
        this._tray.updateWindowAppearance(naggingEnabled, downtimeEnabled);
    }

    /** @param {Rectangle} bounds */
    onDefaultWindowBoundsChanged(bounds) {
        this._configurationStore.setDefaultWindowBounds(bounds);
    }

    async configureTodoistIntegration() {
        const dialogFields = this._todoist.getConfigurationInputDialogFields();

        /** @type {TodoistConfiguration} */
        const dialogResult = await this._appWindow.openInputDialogAndGetResult(dialogFields);

        if (dialogResult) {
            this._todoist.configure(dialogResult);

            this._configurationStore.setIntegrationConfiguration({
                type: "todoist",
                ...dialogResult,
            });
        }
    }

    showFullState() {
        const snapshot = this._appState.getSnapshot(moment());
        const formattedJSon = JSON.stringify(snapshot, undefined, 4);
        this._appWindow.showInfoModal(formattedJSon);
    }

    showAdvancedConfigFile() {
        const configFilePath = this._configurationStore.getAdvancedConfigurationFilePath();
        shell.showItemInFolder(configFilePath);
    }

    toggleMovingResizingEnabled() {
        this._appWindow.toggleMovingResizingEnabled();
        this._tray.updateMovingResizingEnabled(this._appWindow.isMovingResizingEnabled());
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
        const dialogResult = await this._appWindow.openInputDialogAndGetResult([
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
        ]);

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
