const AppState = require("./AppState");
const ConditionMatcher = require("./ConditionMatcher");
const ConfigurationStore = require("./ConfigurationStore");
const Todoist = require("./Todoist");
const AppWindow = require("./AppWindow");

const TIME_BETWEEN_INTEGRATION_REFRESHES = 5 * 1000;
const TIME_BETWEEN_INTEGRATION_CLEANUPS = 10 * 60 * 1000;

const WINDOW_CONDITIONS_CHECK_INTERVAL = 1000;

class Controller {
    async initialize(userDataPath) {
        this._appState = new AppState();
        this._conditionMatcher = new ConditionMatcher();
        this._appWindow = new AppWindow();

        this._configurationStore = new ConfigurationStore(userDataPath);
        this._loadedConfiguration = this._configurationStore.loadFromStore();

        await this._setUpIntegration();

        setInterval(() => {
            this._updateWindow();
        }, WINDOW_CONDITIONS_CHECK_INTERVAL);
    }

    async _setUpIntegration() {
        this._todoist = new Todoist(
            this._loadedConfiguration.todoistLabelName,
            this._loadedConfiguration.todoistToken
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
        let tasksState;

        try {
            tasksState = await this._todoist.getTasksState();
        } catch (error) {
            tasksState = { status: "error", message: error.message };
        }

        this._appState.updateWithTasksState(tasksState);
        const stateSnapshot = this._appState.getSnapshot();
        const customErrors = this._loadedConfiguration.customErrors;

        if (!tasksState.error && customErrors) {
            for (const customError of customErrors) {
                if (this._conditionMatcher.match(customError.condition, stateSnapshot)) {
                    tasksState = { status: "error", message: customError.message };
                    this._appState.updateWithTasksState(tasksState);
                    break;
                }
            }
        }

        this._appWindow.setTasksState(tasksState);
    }

    async _performCleanupForIntegration() {
        try {
            await this._todoist.removeLabelFromTasksOnFutureDate();
        } catch (error) {
            // this is just periodic cleanup, we don't care too much if it fails, don't update app state
            console.log("Failed to remove label from tasks on future date");
        }
    }

    _updateWindow() {
        const stateSnapshot = this._appState.getSnapshot();

        let shouldNag = false;
        let shouldHide = false;

        const naggingConditions = this._loadedConfiguration.naggingConditions;
        const downtimeConditions = this._loadedConfiguration.downtimeConditions;

        if (naggingConditions) {
            shouldNag = naggingConditions.some((condition) =>
                this._conditionMatcher.match(condition, stateSnapshot)
            );
        }

        if (downtimeConditions) {
            shouldHide = downtimeConditions.some((condition) =>
                this._conditionMatcher.match(condition, stateSnapshot)
            );
        }

        this._appWindow.setNaggingMode(shouldNag);
        this._appWindow.setHiddenMode(shouldHide);
    }
}

module.exports = Controller;
