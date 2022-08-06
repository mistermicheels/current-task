/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const moment = require("moment");

class TodoistState {
    constructor() {
        this.reset();
    }

    reset() {
        /** @type {Map<string, TodoistTask>} */
        this._tasksById = new Map();
    }

    /** @param {TodoistTask[]} tasks */
    updateFromTasks(tasks) {
        for (const task of tasks) {
            if (task.checked || task.is_deleted) {
                this._tasksById.delete(task.id);
            } else {
                this._tasksById.set(task.id, task);
            }
        }
    }

    /**
     * @param {string} labelName
     * @param {moment.Moment} now
     * @param {{ includeFutureTasksWithLabel: boolean }} options
     */
    getTasksForTodayOrWithLabel(labelName, now, options) {
        const endOfDay = moment(now).endOf("day");
        const allTasks = this._getAllTasks();

        if (options.includeFutureTasksWithLabel) {
            return allTasks.filter((task) => {
                return (
                    this._isTaskScheduledForTodayOrOverdue(task, endOfDay) ||
                    task.labels.includes(labelName)
                );
            });
        } else {
            return allTasks.filter((task) => {
                return (
                    this._isTaskScheduledForTodayOrOverdue(task, endOfDay) ||
                    (!task.due && task.labels.includes(labelName))
                );
            });
        }
    }

    _getAllTasks() {
        return Array.from(this._tasksById.values());
    }

    /**
     * @param {TodoistTask} task
     * @param {moment.Moment} endOfDay
     */
    _isTaskScheduledForTodayOrOverdue(task, endOfDay) {
        if (!task.due) {
            return false;
        }

        return !moment(task.due.date).isAfter(endOfDay);
    }

    getTasksWithLabel(labelId) {
        const allTasks = this._getAllTasks();
        return allTasks.filter((task) => task.labels.includes(labelId));
    }

    /**
     * @param {string} labelName
     * @param {moment.Moment} now
     */
    getFutureTasksWithLabel(labelName, now) {
        const endOfDay = moment(now).endOf("day");
        const allTasks = this._getAllTasks();

        return allTasks.filter((task) => {
            return (
                task.due &&
                !this._isTaskScheduledForTodayOrOverdue(task, endOfDay) &&
                task.labels.includes(labelName)
            );
        });
    }
}

module.exports = TodoistState;
