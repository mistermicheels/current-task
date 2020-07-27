//@ts-check

/** @typedef { import("../types/Integration").Integration } Integration */

const axios = require("axios").default;

/** @implements Integration */
class Todoist {
    constructor(token, labelName, includeFutureTasksWithLabel) {
        this._token = token;
        this._labelName = labelName;
        this._includeFutureTasksWithLabel = includeFutureTasksWithLabel;

        this._labelId = undefined;
    }

    async initialize() {
        const allLabels = await this._performApiRequest("get", "/labels");
        const matchingLabel = allLabels.find((label) => label.name === this._labelName);

        if (!matchingLabel) {
            throw new Error(`Label with name ${this._labelName} not found`);
        }

        this._labelId = matchingLabel.id;
    }

    async getRelevantTasksForState() {
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

    _getTaskData(taskFromApi) {
        return {
            title: taskFromApi.content,
            dueDate: taskFromApi.due ? taskFromApi.due.date : undefined,
            dueDatetimeUtc: taskFromApi.due ? taskFromApi.due.datetime : undefined,
            hasLabel: taskFromApi.label_ids.includes(this._labelId),
        };
    }

    async performCleanup() {
        if (this._includeFutureTasksWithLabel) {
            return;
        }

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
        try {
            const response = await axios({
                method,
                url: `https://api.todoist.com/rest/v1${relativeUrl}`,
                data,
                headers: { Authorization: `Bearer ${this._token}` },
            });

            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                throw new Error("Invalid Todoist token");
            } else {
                throw new Error("Problem reaching Todoist");
            }
        }
    }
}

module.exports = Todoist;
