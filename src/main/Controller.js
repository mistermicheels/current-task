//@ts-check

/** @typedef { import("./types/TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

const { shell } = require("electron");
const moment = require("moment");

const AppState = require("./AppState");
const AppWindow = require("./AppWindow");
const ConditionMatcher = require("./ConditionMatcher");
const ConfigurationStore = require("./ConfigurationStore");

const TasksStateCalculator = require("./TasksStateCalculator");
const Todoist = require("./integrations/Todoist");
const TrayMenu = require("./TrayMenu");

const TIME_BETWEEN_INTEGRATION_REFRESHES = 5 * 1000;
const TIME_BETWEEN_INTEGRATION_CLEANUPS = 10 * 60 * 1000;

const WINDOW_CONDITIONS_CHECK_INTERVAL = 1000;

/** @implements TrayMenuBackend */
class Controller {
    async initialize() {
        this._configurationStore = new ConfigurationStore();
        this._loadedConfiguration = this._configurationStore.loadFromStore();

        this._conditionMatcher = new ConditionMatcher();
        this._tasksStateCalculator = new TasksStateCalculator();
        this._tasksState = this._tasksStateCalculator.getPlaceholderTasksState();
        this._tasksStateErrorMessage = undefined;
        const customStateRules = this._loadedConfiguration.customStateRules;

        this._appState = new AppState(
            this._conditionMatcher,
            customStateRules,
            this._tasksState,
            new Date()
        );

        await this._setUpIntegration();

        this._appWindow = new AppWindow();
        this._tray = new TrayMenu(this, !this._loadedConfiguration.forbidClosingFromTray);

        setInterval(() => {
            this._updateAppState();
        }, WINDOW_CONDITIONS_CHECK_INTERVAL);
    }

    async _setUpIntegration() {
        this._todoist = new Todoist(
            this._loadedConfiguration.todoistToken,
            this._loadedConfiguration.todoistLabelName,
            this._loadedConfiguration.includeFutureTasksWithLabel
        );

        await this._todoist.initialize();

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
            const relevantTasks = await this._todoist.getRelevantTasksForState();
            const currentTimestampLocal = moment().format();

            this._tasksState = this._tasksStateCalculator.calculateTasksState(
                relevantTasks,
                currentTimestampLocal
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

    _updateAppState() {
        const now = new Date();

        if (this._tasksState) {
            this._appState.updateFromTasksState(this._tasksState, now);
        } else {
            this._appState.updateStatusAndMessage("error", this._tasksStateErrorMessage);
        }

        const newStateSnapshot = this._appState.getSnapshot(now);
        this._appWindow.updateStatusAndMessage(newStateSnapshot.status, newStateSnapshot.message);
        this._tray.updateStatusAndMessage(newStateSnapshot.status, newStateSnapshot.message);
        this._updateWindowAppearance();
    }

    _updateWindowAppearance() {
        const stateSnapshot = this._appState.getSnapshot(new Date());

        let naggingEnabled = false;
        let downtimeEnabled = false;

        const naggingConditions = this._loadedConfiguration.naggingConditions;
        const downtimeConditions = this._loadedConfiguration.downtimeConditions;

        if (naggingConditions) {
            naggingEnabled = naggingConditions.some((condition) =>
                this._conditionMatcher.match(condition, stateSnapshot)
            );
        }

        if (downtimeConditions) {
            downtimeEnabled = downtimeConditions.some((condition) =>
                this._conditionMatcher.match(condition, stateSnapshot)
            );
        }

        this._appWindow.setNaggingMode(naggingEnabled);
        this._appWindow.setHiddenMode(downtimeEnabled);
        this._tray.updateWindowAppareance(naggingEnabled, downtimeEnabled);
    }

    showFullState() {
        const snapshot = this._appState.getSnapshot(new Date());
        const formattedJSon = JSON.stringify(snapshot, undefined, 4);
        this._appWindow.showInfoModal(formattedJSon);
    }

    showConfigFile() {
        const configFilePath = this._configurationStore.getConfigurationFilePath();
        shell.showItemInFolder(configFilePath);
    }

    setMovingResizingEnabled(enabled) {
        this._appWindow.setMovingResizingEnabled(enabled);
    }

    resetPositionAndSize() {
        this._appWindow.resetPositionAndSize();
    }
}

module.exports = Controller;
