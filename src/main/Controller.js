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
        this._tasksStateCalculator = new TasksStateCalculator();
        this._appState = new AppState(this._tasksStateCalculator.getPlaceholderTasksState());
        this._conditionMatcher = new ConditionMatcher();

        this._configurationStore = new ConfigurationStore();
        this._loadedConfiguration = this._configurationStore.loadFromStore();

        await this._setUpIntegration();

        this._appWindow = new AppWindow();
        this._tray = new TrayMenu(this, !this._loadedConfiguration.forbidClosingFromTray);

        setInterval(() => {
            this._updateWindowAppearance();
        }, WINDOW_CONDITIONS_CHECK_INTERVAL);
    }

    async _setUpIntegration() {
        this._todoist = new Todoist(
            this._loadedConfiguration.todoistToken,
            this._loadedConfiguration.todoistLabelName,
            this._loadedConfiguration.includeFutureTasksWithLabel
        );

        await this._todoist.initialize();

        this._refreshFromIntegrationRepeated();
        this._performCleanupForIntegrationRepeated();
    }

    async _refreshFromIntegrationRepeated() {
        await this._refreshFromIntegration();

        setTimeout(
            () => this._refreshFromIntegrationRepeated(),
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

    async _refreshFromIntegration() {
        try {
            const relevantTasks = await this._todoist.getRelevantTasksForState();

            const currentTimestampLocal = moment().format();

            const tasksState = this._tasksStateCalculator.calculateTasksState(
                relevantTasks,
                currentTimestampLocal
            );

            this._appState.updateFromTasksState(tasksState);
        } catch (error) {
            this._appState.updateStatusAndMessage("error", error.message);
        }

        const stateBeforeCustomRules = this._appState.getSnapshot();
        const customStateRules = this._loadedConfiguration.customStateRules;

        if (stateBeforeCustomRules.status === "ok" && customStateRules) {
            for (const rule of customStateRules) {
                if (this._conditionMatcher.match(rule.condition, stateBeforeCustomRules)) {
                    const status = rule.resultingStatus;
                    const message = rule.resultingMessage;
                    this._appState.updateStatusAndMessage(status, message);
                    break;
                }
            }
        }

        const finalState = this._appState.getSnapshot();
        this._appWindow.updateStatusAndMessage(finalState.status, finalState.message);
        this._tray.updateStatusAndMessage(finalState.status, finalState.message);
        this._updateWindowAppearance();
    }

    async _performCleanupForIntegration() {
        try {
            await this._todoist.performCleanup();
        } catch (error) {
            // this is just periodic cleanup, we don't care too much if it fails, don't update app state
            console.log("Failed to remove label from tasks on future date");
        }
    }

    _updateWindowAppearance() {
        const stateSnapshot = this._appState.getSnapshot();

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
        const snapshot = this._appState.getSnapshot();
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
}

module.exports = Controller;
