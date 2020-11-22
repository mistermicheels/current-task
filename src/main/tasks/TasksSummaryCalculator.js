/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./integrations/IntegrationTask").IntegrationTask } IntegrationTask */
/** @typedef { import("./TasksSummary").TasksSummary } TasksSummary */

const DateTimeHelper = require("../util/DateTimeHelper");

class TasksSummaryCalculator {
    constructor() {
        this._dateTimeHelper = new DateTimeHelper();
    }

    /**
     * @param {IntegrationTask[]} relevantTasks
     * @param {Moment} now
     * @returns {TasksSummary}
     */
    getTasksSummaryFromTasks(relevantTasks, now) {
        const relevantTasksMarkedCurrent = this._filterCurrent(relevantTasks);
        const numberMarkedCurrent = relevantTasksMarkedCurrent.length;

        let currentTask;

        if (numberMarkedCurrent === 1) {
            currentTask = relevantTasksMarkedCurrent[0];
        }

        const currentDateLocal = this._dateTimeHelper.getDateString(now);

        return {
            numberMarkedCurrent,
            ...this._getDetailedCounts(relevantTasks, now, currentDateLocal),
            ...this._getCurrentTaskInformation(currentTask, now, currentDateLocal),
        };
    }

    /**
     * @param {IntegrationTask[]} relevantTasks
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

    /** @param {IntegrationTask[]} tasks */
    _filterCurrent(tasks) {
        return tasks.filter((task) => task.markedCurrent);
    }

    /**
     * @param {IntegrationTask} currentTask
     * @param {Moment} now
     * @param {string} currentDateLocal
     */
    _getCurrentTaskInformation(currentTask, now, currentDateLocal) {
        let currentTaskTitle = "";
        let currentTaskHasDate = false;
        let currentTaskHasTime = false;
        let currentTaskIsOverdue = false;
        let currentTaskIsScheduledForToday = false;

        if (currentTask) {
            currentTaskTitle = currentTask.title;
            currentTaskHasDate = !!currentTask.dueDate;
            currentTaskHasTime = !!currentTask.dueDatetime;

            if (currentTaskHasTime) {
                currentTaskIsOverdue = currentTask.dueDatetime.isBefore(now);
            } else if (currentTaskHasDate) {
                currentTaskIsOverdue = currentTask.dueDate < currentDateLocal;
            }

            currentTaskIsScheduledForToday = currentTask.dueDate === currentDateLocal;
        }

        return {
            currentTaskTitle,
            currentTaskHasDate,
            currentTaskHasTime,
            currentTaskIsOverdue,
            currentTaskIsScheduledForToday,
        };
    }

    /** @returns {TasksSummary} */
    getPlaceholderTasksSummary() {
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
            currentTaskIsScheduledForToday: false,
        };
    }

    /** @returns {TasksSummary} */
    getManualTasksSummary(currentTaskTitle) {
        if (currentTaskTitle) {
            return {
                ...this.getPlaceholderTasksSummary(),
                numberMarkedCurrent: 1,
                currentTaskTitle,
            };
        } else {
            return this.getPlaceholderTasksSummary();
        }
    }
}

module.exports = TasksSummaryCalculator;
