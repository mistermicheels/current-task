/** @typedef { import("../../../types/TaskData").TaskData } TaskData */

const moment = require("moment");

class TodoistTaskTransformer {
    /** @returns {TaskData} */
    transform(taskFromApi, currentTaskLabelId) {
        const dueDate = taskFromApi.due ? taskFromApi.due.date : undefined;
        const dueDatetimeString = taskFromApi.due ? taskFromApi.due.datetime : undefined;

        return {
            title: taskFromApi.content,
            dueDate,
            dueDatetime: dueDatetimeString ? moment(dueDatetimeString) : undefined,
            markedCurrent: taskFromApi.label_ids.includes(currentTaskLabelId),
        };
    }
}

module.exports = TodoistTaskTransformer;
