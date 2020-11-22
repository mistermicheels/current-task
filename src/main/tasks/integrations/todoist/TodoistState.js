/** @typedef { import("./TodoistLabel").TodoistLabel } TodoistLabel */
/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const moment = require("moment");

class TodoistState {
    constructor() {
        this.reset();
    }

    reset() {
        /** @type {Map<number, TodoistTask>} */
        this._tasksById = new Map();

        /** @type {Map<number, TodoistLabel>} */
        this._labelsById = new Map();
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

    /** @param {TodoistLabel[]} labels */
    updateFromLabels(labels) {
        for (const label of labels) {
            if (label.is_deleted) {
                this._labelsById.delete(label.id);
            } else {
                this._labelsById.set(label.id, label);
            }
        }
    }

    /**
     * @param {number} labelId
     * @param {moment.Moment} now
     * @param {{ includeFutureTasksWithLabel: boolean }} options
     */
    getTasksForTodayOrWithLabel(labelId, now, options) {
        const endOfDay = moment(now).endOf("day");
        const allTasks = this._getAllTasks();

        if (options.includeFutureTasksWithLabel) {
            return allTasks.filter((task) => {
                return (
                    this._isTaskScheduledForTodayOrOverdue(task, endOfDay) ||
                    task.labels.includes(labelId)
                );
            });
        } else {
            return allTasks.filter((task) => {
                return (
                    this._isTaskScheduledForTodayOrOverdue(task, endOfDay) ||
                    (!task.due && task.labels.includes(labelId))
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
     * @param {number} labelId
     * @param {moment.Moment} now
     */
    getFutureTasksWithLabel(labelId, now) {
        const endOfDay = moment(now).endOf("day");
        const allTasks = this._getAllTasks();

        return allTasks.filter((task) => {
            return (
                task.due &&
                !this._isTaskScheduledForTodayOrOverdue(task, endOfDay) &&
                task.labels.includes(labelId)
            );
        });
    }

    /** @param {string} labelName */
    getLabelId(labelName) {
        const allLabels = Array.from(this._labelsById.values());
        const currentTaskLabel = allLabels.find((label) => label.name === labelName);

        if (!currentTaskLabel) {
            throw new Error(`No label '${labelName}'`);
        }

        return currentTaskLabel.id;
    }
}

module.exports = TodoistState;
