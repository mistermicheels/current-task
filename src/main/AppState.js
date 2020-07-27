class AppState {
    constructor() {
        this._status = "error";
        this._currentTaskInfo = undefined;
    }

    updateWithTasksState(tasksState) {
        this._status = tasksState.status;
        this._currentTaskInfo = tasksState.currentTaskInfo;
    }

    getSnapshot() {
        const now = new Date();

        return {
            dayOfWeek: now.getDay(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            status: this._status,
            currentTaskHasDate: this._currentTaskInfo ? this._currentTaskInfo.hasDate : false,
            currentTaskHasTime: this._currentTaskInfo ? this._currentTaskInfo.hasTime : false,
            currentTaskIsOverdue: this._currentTaskInfo ? this._currentTaskInfo.isOverdue : false,
        };
    }
}

module.exports = AppState;
