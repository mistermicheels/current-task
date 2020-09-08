/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./ConfigurationStore") } ConfigurationStore */
/** @typedef { import("./windows/DialogWindowService") } DialogWindowService */
/** @typedef { import("./Logger") } Logger */
/** @typedef { import("./TasksStateCalculator") } TasksStateCalculator */
/** @typedef { import("../types/Integration").Integration} Integration */
/** @typedef { import("../types/InternalConfiguration").IntegrationConfiguration} IntegrationConfiguration */
/** @typedef { import("../types/IntegrationTasksListener").IntegrationTasksListener} IntegrationTasksListener */
/** @typedef { import("../types/InternalConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("../types/TaskData").TaskData} TaskData */
/** @typedef { import("../types/TasksStateProviderListener").TasksStateProviderListener} TasksStateProviderListener */

const IntegrationTasksRefresher = require("./integrations/IntegrationTasksRefresher");
const Todoist = require("./integrations/todoist/Todoist");

const INTEGRATION_REFRESH_INTERVAL = 2 * 1000;
const INTEGRATION_CLEANUP_INTERVAL = 10 * 60 * 1000;

/** @implements {IntegrationTasksListener} */
class TasksStateProvider {
    /**
     * @param {IntegrationConfiguration} integrationConfiguration
     * @param {TasksStateCalculator} tasksStateCalculator
     * @param {TasksStateProviderListener} tasksStateProviderListener
     * @param {DialogWindowService} dialogWindowService
     * @param {Logger} logger
     */
    constructor(
        integrationConfiguration,
        tasksStateCalculator,
        tasksStateProviderListener,
        dialogWindowService,
        logger
    ) {
        this._tasksStateCalculator = tasksStateCalculator;
        this._tasksStateProviderListener = tasksStateProviderListener;
        this._dialogWindowService = dialogWindowService;
        this._logger = logger;
        this._integrationTasksRefresher = new IntegrationTasksRefresher(this, logger);

        this._manualTask = undefined;
        this._integrationTasks = undefined;
        this._integrationErrorMessage = undefined;
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
        if (this._integrationType === integrationType) {
            return;
        }

        /** @type {IntegrationType} */
        this._integrationType = integrationType;

        /** @type {Integration} */
        this._integrationClassInstance = undefined;

        if (integrationType === "todoist") {
            this._logger.info("Initializing Todoist integration");
            this._integrationClassInstance = new Todoist(this._logger);
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
     * @param {TaskData[]} tasks
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

        this._logger.debug("Performing periodic cleanup for integration");

        try {
            await this._integrationClassInstance.performCleanup();
            this._logger.debug("Successfully performed periodic cleanup for integration");
        } catch (error) {
            // this is just periodic cleanup, we don't care too much if it fails, don't set _integrationErrorMessage
            this._logger.error(
                `Failed to perform cleanup for current integration: ${error.message}`
            );
        }
    }

    /** @param {Moment} now */
    getTasksState(now) {
        if (this._integrationType === "manual") {
            return this._tasksStateCalculator.getManualTasksState(this._manualTask);
        } else if (this._integrationTasks) {
            return this._tasksStateCalculator.getTasksStateFromTasks(this._integrationTasks, now);
        } else {
            return this._tasksStateCalculator.getPlaceholderTasksState();
        }
    }

    getTasksStateErrorMessage() {
        return this._integrationErrorMessage;
    }

    getIntegrationType() {
        return this._integrationType;
    }

    /** @param {IntegrationType} integrationType */
    changeIntegrationType(integrationType) {
        this._setIntegrationType(integrationType);

        this._logger.info(`Changed integration type to ${integrationType}`);
        this._tasksStateProviderListener.onIntegrationTypeChanged();

        const newConfiguration = { type: integrationType };
        this._tasksStateProviderListener.onIntegrationConfigurationChanged(newConfiguration);
    }

    async setManualCurrentTask() {
        if (this._integrationType !== "manual") {
            return;
        }

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

        if (!dialogResult) {
            return;
        }

        this._manualTask = dialogResult.currentTaskTitle;
        this._logger.info("Set manual current task");
        this._tasksStateProviderListener.onManualTasksStateChanged();
    }

    removeManualCurrentTask() {
        if (this._integrationType !== "manual") {
            return;
        }

        this._manualTask = undefined;
        this._logger.info("Removed manual current task");
        this._tasksStateProviderListener.onManualTasksStateChanged();
    }

    async configureIntegration() {
        if (!this._integrationClassInstance) {
            return;
        }

        const dialogFields = this._integrationClassInstance.getConfigurationDialogFields();

        const dialogResult = await this._dialogWindowService.openDialogAndGetResult({
            fields: dialogFields,
            submitButtonName: "Save configuration",
        });

        if (!dialogResult) {
            return;
        }

        const configuration = {
            type: this._integrationType,
            ...dialogResult,
        };

        this._integrationClassInstance.configure(configuration);
        this._logger.info("Adjusted integration configuration");
        this._tasksStateProviderListener.onIntegrationConfigurationChanged(configuration);
    }
}

module.exports = TasksStateProvider;
