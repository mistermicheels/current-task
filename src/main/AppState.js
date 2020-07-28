//@ts-check

/** @typedef { import("./types/StateSnapshot").StateSnapshot } StateSnapshot */
/** @typedef { import("./types/TasksState").TasksState } TasksState */

class AppState {
    /** @param {TasksState} initialTasksState */
    constructor(initialTasksState) {
        this.updateFromTasksState(initialTasksState);
    }

    /** @param {TasksState} tasksState */
    updateFromTasksState(tasksState) {
        this._tasksState = tasksState;
        this._status = "ok";

        if (tasksState.numberMarkedCurrent !== 1) {
            this._message = `(${tasksState.numberMarkedCurrent} tasks marked current)`;
        } else {
            this._message = tasksState.currentTaskTitle;
        }
    }

    updateStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
    }

    /** @returns {StateSnapshot} test*/
    getSnapshot(test) {
        const now = new Date();

        return {
            dayOfWeek: now.getDay(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            ...this._tasksState,
            status: this._status,
            message: this._message,
        };
    }
}

module.exports = AppState;
