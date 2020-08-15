/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../types/TaskData").TaskData } TaskData */
/** @typedef { import("../types/TasksState").TasksState } TasksState */

class TasksStateCalculator {
    /**
     * @param {TaskData[]} relevantTasks
     * @param {Moment} now
     * @returns {TasksState}
     */
    calculateTasksState(relevantTasks, now) {
        const currentDateLocal = now.format().substring(0, 10);

        const overdueTasksWithTime = relevantTasks.filter(
            (task) => task.dueDatetime && task.dueDatetime.isBefore(now)
        );

        const overdueTasksWithTimeMarkedCurrent = overdueTasksWithTime.filter(
            (task) => task.markedCurrent
        );

        const numberOverdueWithTime = overdueTasksWithTime.length;
        const numberOverdueWithTimeMarkedCurrent = overdueTasksWithTimeMarkedCurrent.length;

        const numberOverdueWithTimeNotMarkedCurrent =
            numberOverdueWithTime - numberOverdueWithTimeMarkedCurrent;

        const relevantTasksMarkedCurrent = relevantTasks.filter((task) => task.markedCurrent);
        const numberMarkedCurrent = relevantTasksMarkedCurrent.length;

        let currentTaskTitle = "";
        let currentTaskHasDate = false;
        let currentTaskHasTime = false;
        let currentTaskIsOverdue = false;

        if (numberMarkedCurrent === 1) {
            const currentTask = relevantTasksMarkedCurrent[0];
            currentTaskTitle = currentTask.title;
            currentTaskHasDate = !!currentTask.dueDate;
            currentTaskHasTime = !!currentTask.dueDatetime;

            if (currentTaskHasTime) {
                currentTaskIsOverdue = currentTask.dueDatetime.isBefore(now);
            } else if (currentTaskHasDate) {
                currentTaskIsOverdue = currentTask.dueDate < currentDateLocal;
            }
        }

        return {
            numberOverdueWithTime,
            numberOverdueWithTimeMarkedCurrent,
            numberOverdueWithTimeNotMarkedCurrent,
            numberMarkedCurrent,
            currentTaskTitle,
            currentTaskHasDate,
            currentTaskHasTime,
            currentTaskIsOverdue,
        };
    }

    /** @returns {TasksState} */
    getPlaceholderTasksState() {
        return {
            numberOverdueWithTime: 0,
            numberOverdueWithTimeMarkedCurrent: 0,
            numberOverdueWithTimeNotMarkedCurrent: 0,
            numberMarkedCurrent: 0,
            currentTaskTitle: "",
            currentTaskHasDate: false,
            currentTaskHasTime: false,
            currentTaskIsOverdue: false,
        };
    }

    /** @returns {TasksState} */
    getManualTasksState(currentTaskTitle) {
        if (currentTaskTitle) {
            return {
                ...this.getPlaceholderTasksState(),
                numberMarkedCurrent: 1,
                currentTaskTitle,
            };
        } else {
            return this.getPlaceholderTasksState();
        }
    }
}

module.exports = TasksStateCalculator;
