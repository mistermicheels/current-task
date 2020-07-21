const axios = require("axios").default;

class Todoist {
    constructor(labelName, token) {
        this._labelName = labelName;
        this._token = token;

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

    _checkInitialized() {
        if (!this._labelId) {
            throw new Error("Please call the initialize() method first");
        }
    }

    async getTasksState() {
        this._checkInitialized();
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const isoDateOnly = isoTimestamp.substring(0, 10);
        const hours = now.getHours();

        const tasksForToday = await this._performApiRequest("get", "/tasks?filter=today | overdue");

        const overdueTasksWithTime = tasksForToday.filter(
            (task) => task.due.datetime && task.due.datetime < isoTimestamp
        );

        const taskForTodayWithLabel = tasksForToday.filter((task) =>
            task.label_ids.includes(this._labelId)
        );

        const noDateTasksWithLabel = await this._performApiRequest(
            "get",
            `/tasks?filter=${encodeURIComponent(`no date & @${this._labelName}`)}`
        );

        const relevantTasksWithLabel = [...taskForTodayWithLabel, ...noDateTasksWithLabel];

        if (overdueTasksWithTime.some((task) => !relevantTasksWithLabel.includes(task))) {
            return { state: "warning", message: "Scheduled task" };
        } else if (relevantTasksWithLabel.length < 1) {
            return { state: "error", message: "No current task" };
        } else if (relevantTasksWithLabel.length > 1) {
            return { state: "error", message: "Multiple current" };
        } else if ((hours >= 19 || hours < 8) && overdueTasksWithTime.length === 0) {
            return { state: "error", message: "Only scheduled social" };
        } else {
            const labeledTask = relevantTasksWithLabel[0];
            const hasDate = !!labeledTask.due;
            const hasTime = !!(labeledTask.due && labeledTask.due.datetime);

            const isOverDue =
                (hasTime && labeledTask.due.datetime < isoTimestamp) ||
                (!hasTime && hasDate && labeledTask.due.date < isoDateOnly);

            return {
                state: "ok",
                message: labeledTask.content,
                labeledTaskInfo: { hasDate, hasTime, isOverDue },
            };
        }
    }

    async removeLabelFromTasksOnFutureDate() {
        this._checkInitialized();
        const isoTimestamp = new Date().toISOString();

        const allTasks = await this._performApiRequest("get", "/tasks");

        const tasksOnFutureDate = allTasks.filter(
            (task) => task.due && task.due.date && task.due.date > isoTimestamp
        );

        const tasksOnFutureDateWithLabel = tasksOnFutureDate.filter((task) =>
            task.label_ids.includes(this._labelId)
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
