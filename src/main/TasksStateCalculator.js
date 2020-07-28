//@ts-check

/** @typedef { import("./types/TasksState").TasksState } TasksState */

class TasksStateCalculator {
    /** @returns {TasksState} */
    calculateTasksState(relevantTasks, currentTimestampLocal) {
        const currentTimestampUtc = new Date(currentTimestampLocal).toISOString();
        const currentDateLocal = currentTimestampLocal.substring(0, 10);

        const overdueTasksWithTime = relevantTasks.filter(
            (task) => task.dueDatetimeUtc && task.dueDatetimeUtc < currentTimestampUtc
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
            currentTaskHasTime = !!currentTask.dueDatetimeUtc;

            if (currentTaskHasTime) {
                currentTaskIsOverdue = currentTask.dueDatetimeUtc < currentTimestampUtc;
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
}

module.exports = TasksStateCalculator;
