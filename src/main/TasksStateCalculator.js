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

        const overdueTasksWithTimeAndLabel = overdueTasksWithTime.filter((task) => task.hasLabel);

        const numberOverdueWithTime = overdueTasksWithTime.length;
        const numberOverdueWithTimeAndLabel = overdueTasksWithTimeAndLabel.length;

        const numberOverdueWithTimeWithoutLabel =
            numberOverdueWithTime - numberOverdueWithTimeAndLabel;

        const relevantTasksWithLabel = relevantTasks.filter((task) => task.hasLabel);
        const numberWithLabel = relevantTasksWithLabel.length;

        let currentTaskTitle = "";
        let currentTaskHasDate = false;
        let currentTaskHasTime = false;
        let currentTaskIsOverdue = false;

        if (numberWithLabel === 1) {
            const currentTask = relevantTasksWithLabel[0];
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
            numberOverdueWithTimeAndLabel,
            numberOverdueWithTimeWithoutLabel,
            numberWithLabel,
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
            numberOverdueWithTimeAndLabel: 0,
            numberOverdueWithTimeWithoutLabel: 0,
            numberWithLabel: 0,
            currentTaskTitle: "",
            currentTaskHasDate: false,
            currentTaskHasTime: false,
            currentTaskIsOverdue: false,
        };
    }
}

module.exports = TasksStateCalculator;