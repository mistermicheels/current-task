/** @typedef { import("../TaskData").TaskData } TaskData */
/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const moment = require("moment");

const DateTimeHelper = require("../../../util/DateTimeHelper");

class TodoistTaskTransformer {
    constructor() {
        this._dateTimeHelper = new DateTimeHelper();
    }

    /**
     * @param {TodoistTask} taskFromApi
     * @param {number} currentTaskLabelId
     * @returns {TaskData}
     */
    transform(taskFromApi, currentTaskLabelId) {
        let dueDate = undefined;
        let dueDatetime = undefined;

        if (taskFromApi.due) {
            dueDate = this._dateTimeHelper.getDateString(taskFromApi.due.date);
            const hasTime = taskFromApi.due.date.length > dueDate.length;

            if (hasTime) {
                dueDatetime = moment(taskFromApi.due.date);
            }
        }

        return {
            title: taskFromApi.content,
            dueDate,
            dueDatetime,
            markedCurrent: taskFromApi.labels.includes(currentTaskLabelId),
        };
    }
}

module.exports = TodoistTaskTransformer;
