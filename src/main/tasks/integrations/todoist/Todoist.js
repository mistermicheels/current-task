/** @typedef { import("../../../configuration/IntegrationConfiguration").TodoistIntegrationConfiguration } TodoistIntegrationConfiguration */
/** @typedef { import("../../../windows/DialogInput").DialogField } DialogField */
/** @typedef { import("../../../Logger") } Logger */
/** @typedef { import("../Integration").Integration<"todoist"> } TodoistIntegration */

const moment = require("moment");

const TodoistApi = require("./TodoistApi");
const TodoistState = require("./TodoistState");
const TodoistTaskMerger = require("./TodoistTaskMerger");
const TodoistTaskTransformer = require("./TodoistTaskTransformer");

/** @implements {TodoistIntegration} */
class Todoist {
    /** @param {Logger} logger */
    constructor(logger) {
        this._token = undefined;
        this._labelName = undefined;
        this._includeFutureTasksWithLabel = undefined;
        this._mergeSubtasksWithParent = undefined;

        this._api = new TodoistApi(logger);
        this._merger = new TodoistTaskMerger();
        this._state = new TodoistState();
        this._transformer = new TodoistTaskTransformer();

        this._logger = logger;
    }

    /** @returns {DialogField[]} */
    getConfigurationDialogFields() {
        return [
            {
                type: "text",
                name: "token",
                label: "Todoist token",
                placeholder: "Your Todoist API token",
                required: true,
                inputType: "password",
                info:
                    "Do not share this token with anyone. If you don't have a token yet, you can get it from the Todoist web UI under Settings - Integrations - API token.",
                currentValue: this._token,
            },
            {
                type: "text",
                name: "labelName",
                label: "Label name",
                placeholder: "Current task label",
                required: true,
                info: "This is the Todoist label you will use to mark a task as current.",
                currentValue: this._labelName,
            },
            {
                type: "boolean",
                name: "includeFutureTasksWithLabel",
                label: "Include future tasks with the label",
                info:
                    "If enabled, the application will also look at tasks scheduled for a date in the future. If not enabled, those tasks will be ignored and the label will be automatically removed from them (this can be helpful for recurring tasks).",
                currentValue: !!this._includeFutureTasksWithLabel,
            },
            {
                type: "boolean",
                name: "mergeSubtasksWithParent",
                label: "Merge subtasks with parent",
                info:
                    "If enabled, a task with the label will be ignored if at least one of its subtasks also has the label. In that case, the subtasks with the label will also inherit the parent task's due date if they don't have their own due date.",
                currentValue: !!this._mergeSubtasksWithParent,
            },
        ];
    }

    /** @param {TodoistIntegrationConfiguration} configuration*/
    configure(configuration) {
        this._token = configuration.token;
        this._labelName = configuration.labelName;
        this._includeFutureTasksWithLabel = configuration.includeFutureTasksWithLabel;
        this._mergeSubtasksWithParent = configuration.mergeSubtasksWithParent;
    }

    async getRelevantTasksForState() {
        this._logger.debugIntegration("Retrieving task and label updates from Todoist");
        this._checkTokenAndLabelNameSpecified();

        await this._updateStateFromApi();

        const now = moment();

        let relevantTasks = this._state.getTasksForTodayOrWithLabel(this._labelName, now, {
            includeFutureTasksWithLabel: !!this._includeFutureTasksWithLabel,
        });

        if (this._mergeSubtasksWithParent) {
            relevantTasks = this._merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
                relevantTasks,
                this._labelName
            );
        }

        return relevantTasks.map((task) => this._transformer.transform(task, this._labelName));
    }

    async _updateStateFromApi() {
        const taskAndLabelChanges = await this._api.getTaskChanges(this._token);

        if (taskAndLabelChanges.wasFullSync) {
            this._state.reset();
        }

        this._state.updateFromTasks(taskAndLabelChanges.changedTasks);
    }

    async clearCurrent() {
        this._checkTokenAndLabelNameSpecified();

        const tasksWithLabel = this._state.getTasksWithLabel(this._labelName);

        if (tasksWithLabel.length > 0) {
            this._logger.debugIntegration("Removing the label from current tasks in Todoist");
            await this._api.removeLabelFromTasks(tasksWithLabel, this._labelName, this._token);
        }
    }

    isCleanupNeeded() {
        if (this._includeFutureTasksWithLabel || !this._labelName) {
            return false;
        }

        const futureTasksWithLabel = this._getFutureTasksWithLabel();
        return futureTasksWithLabel.length > 0;
    }

    _getFutureTasksWithLabel() {
        const now = moment();
        return this._state.getFutureTasksWithLabel(this._labelName, now);
    }

    async performCleanup() {
        this._logger.debugIntegration("Removing the label from future tasks in Todoist");
        this._checkTokenAndLabelNameSpecified();

        const futureTasksWithLabel = this._getFutureTasksWithLabel();

        if (futureTasksWithLabel.length > 0) {
            await this._api.removeLabelFromTasks(
                futureTasksWithLabel,
                this._labelName,
                this._token
            );
        }
    }

    _checkTokenAndLabelNameSpecified() {
        if (!this._token || !this._labelName) {
            throw new Error("Todoist not configured");
        }
    }
}

module.exports = Todoist;
