/** @typedef { import("../TaskData").TaskData } TaskData */
/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const moment = require("moment");

// YYYY-MM-DD
const DATE_STRING_LENGTH = 10;

class TodoistTaskTransformer {
    /**
     * @param {TodoistTask} taskFromApi
     * @param {number} currentTaskLabelId
     * @returns {TaskData}
     */
    transform(taskFromApi, currentTaskLabelId) {
        let dueDate = undefined;
        let dueDatetime = undefined;

        if (taskFromApi.due) {
            dueDate = taskFromApi.due.date.substring(0, DATE_STRING_LENGTH);
            const hasTime = taskFromApi.due.date.length > DATE_STRING_LENGTH;

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
