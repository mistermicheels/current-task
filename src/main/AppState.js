class AppState {
    constructor() {
        this._tasksState = {};

        this._status = "ok";
        this._message = "Initializing...";
    }

    updateFromTasksState(tasksState) {
        this._tasksState = tasksState;
        this._status = "ok";

        if (tasksState.numberWithLabel !== 1) {
            this._message = `(${tasksState.numberWithLabel} tasks with label)`;
        } else {
            this._message = tasksState.currentTaskTitle;
        }
    }

    updateStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
    }

    getSnapshot() {
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
