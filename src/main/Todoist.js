const axios = require("axios").default;

class Todoist {
    constructor(labelId, token) {
        this._labelId = labelId;
        this._token = token;
    }

    async getTasksState() {
        let activeTasksForToday;

        try {
            const response = await this._makeApiRequest("get", "/tasks?filter=today | overdue");
            activeTasksForToday = response.data;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                return { state: "error", message: "Invalid Todoist token" };
            } else {
                return { state: "error", message: "Problem reaching Todoist" };
            }
        }

        const now = new Date();
        const currentIsoTimestamp = now.toISOString();
        const currentHours = now.getHours();

        const labeledCurrent = activeTasksForToday.filter((task) =>
            task.label_ids.includes(this._labelId)
        );

        const scheduled = activeTasksForToday.filter(
            (task) => task.due.datetime && task.due.datetime < currentIsoTimestamp
        );

        if (scheduled.some((task) => !labeledCurrent.includes(task))) {
            return { state: "warning", message: "Scheduled task" };
        } else if (labeledCurrent.length < 1) {
            return { state: "error", message: "No current task" };
        } else if (labeledCurrent.length > 1) {
            return { state: "error", message: "Multiple current" };
        } else if ((currentHours >= 19 || currentHours < 8) && scheduled.length === 0) {
            return { state: "error", message: "Only scheduled social" };
        } else {
            return { state: "ok", message: labeledCurrent[0].content };
        }
    }

    async removeCurrentLabelFromFutureTasks() {
        const activeTasks = await this._getApiResultOrUndefined(
            this._makeApiRequest("get", "/tasks")
        );

        if (!activeTasks) {
            return;
        }

        const currentIsoTimestamp = new Date().toISOString();

        const futureTasks = activeTasks.filter(
            (task) => task.due && task.due.date && task.due.date > currentIsoTimestamp
        );
        const futureTasksWithCurrentLabel = futureTasks.filter((task) =>
            task.label_ids.includes(this._labelId)
        );

        for (const task of futureTasksWithCurrentLabel) {
            await this._getApiResultOrUndefined(
                this._makeApiRequest("post", `/tasks/${task.id}`, {
                    label_ids: task.label_ids.filter((id) => id !== this._labelId),
                })
            );
        }
    }

    _makeApiRequest(method, relativeUrl, data) {
        return axios({
            method,
            url: `https://api.todoist.com/rest/v1${relativeUrl}`,
            data,
            headers: { Authorization: `Bearer ${this._token}` },
        });
    }

    async _getApiResultOrUndefined(requestPromise) {
        try {
            const response = await requestPromise;
            return response.data;
        } catch (error) {
            return undefined;
        }
    }
}

module.exports = Todoist;
