/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../configuration/ConfigurationStore") } ConfigurationStore */
/** @typedef { import("../configuration/IntegrationConfiguration").IntegrationConfiguration} IntegrationConfiguration */
/** @typedef { import("../configuration/IntegrationConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("../windows/DialogWindowService") } DialogWindowService */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./integrations/Integration").Integration} Integration */
/** @typedef { import("./integrations/IntegrationTasksListener").IntegrationTasksListener} IntegrationTasksListener */
/** @typedef { import("./integrations/IntegrationTask").IntegrationTask} IntegrationTask */
/** @typedef { import("./TasksSummaryCalculator") } TasksSummaryCalculator */
/** @typedef { import("./TasksTrackerListener").TasksTrackerListener} TasksTrackerListener */

const moment = require("moment");

const Todoist = require("./integrations/todoist/Todoist");
const Trello = require("./integrations/trello/Trello");
const { IntegrationTasksRefresher } = require("./integrations/IntegrationTasksRefresher");

const INTEGRATION_REFRESH_INTERVAL = 2 * 1000;
const INTEGRATION_CLEANUP_INTERVAL = 10 * 60 * 1000;
const SECONDS_BETWEEN_INTEGRATION_CLEAR_CURRENT = 10;

/** @implements {IntegrationTasksListener} */
class TasksTracker {
    /**
     * @param {IntegrationConfiguration} integrationConfiguration
     * @param {TasksSummaryCalculator} tasksSummaryCalculator
     * @param {TasksTrackerListener} tasksTrackerListener
     * @param {DialogWindowService} dialogWindowService
     * @param {Logger} logger
     */
    constructor(
        integrationConfiguration,
        tasksSummaryCalculator,
        tasksTrackerListener,
        dialogWindowService,
        logger
    ) {
        this._tasksSummaryCalculator = tasksSummaryCalculator;
        this._tasksTrackerListener = tasksTrackerListener;
        this._dialogWindowService = dialogWindowService;
        this._logger = logger;
        this._integrationTasksRefresher = new IntegrationTasksRefresher(this, logger);

        this._manualTask = undefined;
        this._integrationTasks = undefined;
        this._integrationErrorMessage = undefined;

        this._hasOpenDialog = false;

        this._setUpIntegration(integrationConfiguration);
    }

    _setUpIntegration(integrationConfiguration) {
        const integrationType = integrationConfiguration ? integrationConfiguration.type : "manual";
        this._setIntegrationType(integrationType);

        if (this._integrationClassInstance) {
            this._integrationClassInstance.configure(integrationConfiguration);
        }

        this._refreshFromIntegration();
        setInterval(() => this._refreshFromIntegration(), INTEGRATION_REFRESH_INTERVAL);
        setInterval(() => this._performCleanupForIntegration(), INTEGRATION_CLEANUP_INTERVAL);
    }

    /** @param {IntegrationType} integrationType */
    _setIntegrationType(integrationType) {
        /** @type {IntegrationType} */
        this._integrationType = integrationType;

        /** @type {Integration} */
        this._integrationClassInstance = undefined;

        if (integrationType === "todoist") {
            this._logger.info("Initializing Todoist integration");
            this._integrationClassInstance = new Todoist(this._logger);
        } else if (integrationType === "trello") {
            this._logger.info("Initializing Trello integration");
            this._integrationClassInstance = new Trello(this._logger);
        }

        this._manualTask = undefined;
        this._integrationTasks = this._integrationClassInstance ? [] : undefined;
        this._integrationErrorMessage = undefined;
    }

    _refreshFromIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        this._integrationTasksRefresher.triggerRefresh(this._integrationClassInstance);
    }

    /**
     * @param {IntegrationTask[]} tasks
     * @param {string} errorMessage
     * @param {Integration} integrationClassInstance
     */
    onTasksRefreshed(tasks, errorMessage, integrationClassInstance) {
        if (integrationClassInstance !== this._integrationClassInstance) {
            return;
        }

        this._integrationTasks = tasks;
        this._integrationErrorMessage = errorMessage;
    }

    async _performCleanupForIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        this._logger.debugIntegration("Performing periodic cleanup for integration");

        try {
            await this._integrationClassInstance.performCleanup();

            this._logger.debugIntegration(
                "Successfully performed periodic cleanup for integration"
            );
        } catch (error) {
            // this is just periodic cleanup, we don't care too much if it fails, don't set _integrationErrorMessage
            this._logger.error(
                `Failed to perform cleanup for current integration: ${error.message}`
            );
        }
    }

    /** @param {Moment} now */
    getTasksSummary(now) {
        if (this._integrationType === "manual") {
            return this._tasksSummaryCalculator.getManualTasksSummary(this._manualTask);
        } else if (this._integrationTasks) {
            return this._tasksSummaryCalculator.getTasksSummaryFromTasks(
                this._integrationTasks,
                now
            );
        } else {
            return this._tasksSummaryCalculator.getPlaceholderTasksSummary();
        }
    }

    getTasksSummaryErrorMessage() {
        return this._integrationErrorMessage;
    }

    getIntegrationType() {
        return this._integrationType;
    }

    /** @param {IntegrationType} integrationType */
    changeIntegrationType(integrationType) {
        if (this._hasOpenDialog) {
            this._dialogWindowService.focusOpenDialog();
            return;
        }

        if (this._integrationType === integrationType) {
            return;
        }

        this._setIntegrationType(integrationType);

        this._logger.info(`Changed integration type to ${integrationType}`);
        this._tasksTrackerListener.onIntegrationTypeChanged();

        const newConfiguration = { type: integrationType };
        this._tasksTrackerListener.onIntegrationConfigurationChanged(newConfiguration);
    }

    async setManualCurrentTask() {
        if (this._integrationType !== "manual") {
            return;
        }

        this._hasOpenDialog = true;

        const dialogResult = await this._dialogWindowService.openDialogAndGetResult({
            fields: [
                {
                    type: "text",
                    name: "currentTaskTitle",
                    label: "Current task",
                    placeholder: "Enter the task title here",
                    required: true,
                    currentValue: this._manualTask,
                },
            ],
            submitButtonName: "Set as current task",
        });

        this._hasOpenDialog = false;

        if (!dialogResult) {
            return;
        }

        this._manualTask = dialogResult.currentTaskTitle;
        this._logger.info("Set manual current task");
        this._tasksTrackerListener.onManualTaskChanged();
    }

    removeManualCurrentTask() {
        if (this._integrationType !== "manual") {
            return;
        }

        this._manualTask = undefined;
        this._logger.info("Removed manual current task");
        this._tasksTrackerListener.onManualTaskChanged();
    }

    async clearCurrent() {
        if (this._integrationType === "manual" && this._manualTask) {
            this.removeManualCurrentTask();
        } else if (this._integrationClassInstance) {
            this.clearCurrentForIntegration();
        }
    }

    async clearCurrentForIntegration() {
        let secondsSinceCleared = Infinity;

        if (this._lastTimeCurrentCleared) {
            const now = moment();
            secondsSinceCleared = now.diff(this._lastTimeCurrentCleared, "seconds");
        }

        if (secondsSinceCleared < SECONDS_BETWEEN_INTEGRATION_CLEAR_CURRENT) {
            return;
        }

        this._lastTimeCurrentCleared = moment();

        try {
            await this._integrationClassInstance.clearCurrent();
        } catch (_error) {
            this._logger.error("Error clearing current task");
        }
    }

    async configureIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        this._hasOpenDialog = true;

        const dialogResult = await this._dialogWindowService.openDialogAndGetResult({
            fields: this._integrationClassInstance.getConfigurationDialogFields(),
            submitButtonName: "Save configuration",
        });

        this._hasOpenDialog = false;

        if (!dialogResult) {
            return;
        }

        const configuration = {
            type: this._integrationType,
            ...dialogResult,
        };

        this._integrationClassInstance.configure(configuration);
        this._logger.info("Adjusted integration configuration");
        this._tasksTrackerListener.onIntegrationConfigurationChanged(configuration);
    }
}

module.exports = TasksTracker;
