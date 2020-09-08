/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../types/TaskData").TaskData } TaskData */
/** @typedef { import("../types/TasksState").TasksState } TasksState */

class TasksStateCalculator {
    /**
     * @param {TaskData[]} relevantTasks
     * @param {Moment} now
     * @returns {TasksState}
     */
    getTasksStateFromTasks(relevantTasks, now) {
        const relevantTasksMarkedCurrent = this._filterCurrent(relevantTasks);
        const numberMarkedCurrent = relevantTasksMarkedCurrent.length;

        let currentTask;

        if (numberMarkedCurrent === 1) {
            currentTask = relevantTasksMarkedCurrent[0];
        }

        const currentDateLocal = now.format().substring(0, 10);

        return {
            numberMarkedCurrent,
            ...this._getDetailedCounts(relevantTasks, now, currentDateLocal),
            ...this._getCurrentTaskInformation(currentTask, now, currentDateLocal),
        };
    }

    /**
     * @param {TaskData[]} relevantTasks
     * @param {Moment} now
     * @param {string} currentDateLocal
     */
    _getDetailedCounts(relevantTasks, now, currentDateLocal) {
        const overdueTasksWithTime = relevantTasks.filter(
            (task) => task.dueDatetime && task.dueDatetime.isBefore(now)
        );

        const overdueTasksWithoutTime = relevantTasks.filter(
            (task) => !task.dueDatetime && task.dueDate < currentDateLocal
        );

        const overdueTasks = [...overdueTasksWithTime, ...overdueTasksWithoutTime];

        const tasksScheduledForToday = relevantTasks.filter(
            (task) => task.dueDate === currentDateLocal
        );

        const overdueTasksMarkedCurrent = this._filterCurrent(overdueTasks);
        const overdueTasksWithTimeMarkedCurrent = this._filterCurrent(overdueTasksWithTime);
        const tasksScheduledForTodayMarkedCurrent = this._filterCurrent(tasksScheduledForToday);

        return {
            numberOverdue: overdueTasks.length,
            numberOverdueMarkedCurrent: overdueTasksMarkedCurrent.length,
            numberOverdueNotMarkedCurrent: overdueTasks.length - overdueTasksMarkedCurrent.length,

            numberOverdueWithTime: overdueTasksWithTime.length,
            numberOverdueWithTimeMarkedCurrent: overdueTasksWithTimeMarkedCurrent.length,
            numberOverdueWithTimeNotMarkedCurrent:
                overdueTasksWithTime.length - overdueTasksWithTimeMarkedCurrent.length,

            numberScheduledForToday: tasksScheduledForToday.length,
            numberScheduledForTodayMarkedCurrent: tasksScheduledForTodayMarkedCurrent.length,
            numberScheduledForTodayNotMarkedCurrent:
                tasksScheduledForToday.length - tasksScheduledForTodayMarkedCurrent.length,
        };
    }

    /** @param {TaskData[]} tasks */
    _filterCurrent(tasks) {
        return tasks.filter((task) => task.markedCurrent);
    }

    /**
     * @param {TaskData} currentTask
     * @param {Moment} now
     * @param {string} currentDateLocal
     */
    _getCurrentTaskInformation(currentTask, now, currentDateLocal) {
        let currentTaskTitle = "";
        let currentTaskHasDate = false;
        let currentTaskHasTime = false;
        let currentTaskIsOverdue = false;

        if (currentTask) {
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
            currentTaskTitle,
            currentTaskHasDate,
            currentTaskHasTime,
            currentTaskIsOverdue,
        };
    }

    /** @returns {TasksState} */
    getPlaceholderTasksState() {
        return {
            numberOverdue: 0,
            numberOverdueMarkedCurrent: 0,
            numberOverdueNotMarkedCurrent: 0,
            numberOverdueWithTime: 0,
            numberOverdueWithTimeMarkedCurrent: 0,
            numberOverdueWithTimeNotMarkedCurrent: 0,
            numberScheduledForToday: 0,
            numberScheduledForTodayMarkedCurrent: 0,
            numberScheduledForTodayNotMarkedCurrent: 0,
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
