class AppState {
    constructor() {
        this._state = "error";
        this._currentTaskInfo = undefined;
    }

    updateWithTasksState(tasksState) {
        this._state = tasksState.state;
        this._currentTaskInfo = tasksState.currentTaskInfo;
    }

    getSnapshot(temporaryTasksState) {
        const now = new Date();

        const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ];

        const state = temporaryTasksState ? temporaryTasksState.state : this._state;

        const currentTaskInfo = temporaryTasksState
            ? temporaryTasksState.currentTaskInfo
            : this._currentTaskInfo;

        return {
            dayName: dayNames[now.getDay()],
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            state,
            currentTaskHasDate: currentTaskInfo ? currentTaskInfo.hasDate : undefined,
            currentTaskHasTime: currentTaskInfo ? currentTaskInfo.hasTime : undefined,
            currentTaskIsOverdue: currentTaskInfo ? currentTaskInfo.isOverdue : undefined,
        };
    }
}

module.exports = AppState;
