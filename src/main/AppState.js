class AppState {
    constructor() {
        this._status = "error";
        this._currentTaskInfo = undefined;
    }

    updateWithTasksState(tasksState) {
        this._status = tasksState.status;
        this._currentTaskInfo = tasksState.currentTaskInfo;
    }

    getSnapshot(temporaryTasksState) {
        const now = new Date();

        const status = temporaryTasksState ? temporaryTasksState.status : this._status;

        const currentTaskInfo = temporaryTasksState
            ? temporaryTasksState.currentTaskInfo
            : this._currentTaskInfo;

        return {
            dayOfWeek: now.getDay(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            status,
            currentTaskHasDate: currentTaskInfo ? currentTaskInfo.hasDate : false,
            currentTaskHasTime: currentTaskInfo ? currentTaskInfo.hasTime : false,
            currentTaskIsOverdue: currentTaskInfo ? currentTaskInfo.isOverdue : false,
        };
    }
}

module.exports = AppState;
