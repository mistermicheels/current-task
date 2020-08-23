/** @typedef { import("../Logger") } Logger */
/** @typedef { import("../../types/DialogInput").DialogField } DialogField */
/** @typedef { import("../../types/Integration").Integration<"todoist"> } TodoistIntegration */
/** @typedef { import("../../types/InternalConfiguration").TodoistIntegrationConfiguration } TodoistIntegrationConfiguration */
/** @typedef { import("../../types/TaskData").TaskData } TaskData */

const axios = require("axios").default;
const moment = require("moment");

/** @implements {TodoistIntegration} */
class Todoist {
    /** @param {Logger} logger */
    constructor(logger) {
        this._token = undefined;
        this._labelName = undefined;
        this._includeFutureTasksWithLabel = undefined;

        this._labelId = undefined;

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
        ];
    }

    /** @param {TodoistIntegrationConfiguration} configuration*/
    configure(configuration) {
        this._token = configuration.token;
        this._labelName = configuration.labelName;
        this._includeFutureTasksWithLabel = configuration.includeFutureTasksWithLabel;

        this._labelId = undefined;
    }

    async _ensureInitialized() {
        if (this._labelId) {
            return;
        }

        const allLabels = await this._performApiRequest("get", "/labels");
        const matchingLabel = allLabels.find((label) => label.name === this._labelName);

        if (!matchingLabel) {
            throw new Error(`Label with name ${this._labelName} not found`);
        }

        this._labelId = matchingLabel.id;
    }

    async getRelevantTasksForState() {
        await this._ensureInitialized();

        let filter;

        if (this._includeFutureTasksWithLabel) {
            filter = `today | overdue | @${this._labelName}`;
        } else {
            filter = `today | overdue | (no date & @${this._labelName})`;
        }

        const relevantTasksFromApi = await this._performApiRequest(
            "get",
            `/tasks?filter=${encodeURIComponent(filter)}`
        );

        return relevantTasksFromApi.map((task) => this._getTaskData(task));
    }

    /** @returns {TaskData} */
    _getTaskData(taskFromApi) {
        const dueDate = taskFromApi.due ? taskFromApi.due.date : undefined;
        const dueDatetimeString = taskFromApi.due ? taskFromApi.due.datetime : undefined;

        return {
            title: taskFromApi.content,
            dueDate,
            dueDatetime: dueDatetimeString ? moment(dueDatetimeString) : undefined,
            markedCurrent: taskFromApi.label_ids.includes(this._labelId),
        };
    }

    async performCleanup() {
        if (this._includeFutureTasksWithLabel) {
            return;
        }

        await this._ensureInitialized();

        const tasksOnFutureDateWithLabel = await this._performApiRequest(
            "get",
            `/tasks?filter=${encodeURIComponent(`Due after: today & @${this._labelName}`)}`
        );

        for (const task of tasksOnFutureDateWithLabel) {
            await this._performApiRequest("post", `/tasks/${task.id}`, {
                label_ids: task.label_ids.filter((id) => id !== this._labelId),
            });
        }
    }

    async _performApiRequest(method, relativeUrl, data) {
        this._logger.debug(`Calling Todoist ${method} ${relativeUrl}`);

        try {
            const response = await axios({
                method,
                url: `https://api.todoist.com/rest/v1${relativeUrl}`,
                data,
                headers: { Authorization: `Bearer ${this._token}` },
            });

            this._logger.debug(`Todoist ${method} ${relativeUrl} successful`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                this._logger.debug(`Todoist ${method} ${relativeUrl} auth error`);
                throw new Error("Invalid Todoist token");
            } else {
                this._logger.debug(`Todoist ${method} ${relativeUrl} general error`);
                throw new Error("Problem reaching Todoist");
            }
        }
    }
}

module.exports = Todoist;
