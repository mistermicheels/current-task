//@ts-check

/** @typedef { import("./ConditionMatcher") } ConditionMatcher */
/** @typedef { import("./types/Configuration").CustomStateRule } CustomStateRule */
/** @typedef { import("./types/StateSnapshot").StateSnapshot } StateSnapshot */
/** @typedef { import("./types/TasksState").TasksState } TasksState */

class AppState {
    /**
     * @param {ConditionMatcher} conditionMatcher
     * @param {CustomStateRule[]} customStateRules
     * @param {TasksState} initialTasksState
     * @param {Date} now
     */
    constructor(conditionMatcher, customStateRules, initialTasksState, now) {
        this._conditionMatcher = conditionMatcher;
        this._customStateRules = customStateRules;
        this.updateFromTasksState(initialTasksState, now);
    }

    /**
     * @param {TasksState} tasksState
     * @param {Date} now
     */
    updateFromTasksState(tasksState, now) {
        this._tasksState = tasksState;
        this._status = "ok";

        if (tasksState.numberMarkedCurrent !== 1) {
            this._message = `(${tasksState.numberMarkedCurrent} tasks marked current)`;
        } else {
            this._message = tasksState.currentTaskTitle;
        }

        const stateBeforeCustomRules = this.getSnapshot(now);
        const customStateRules = this._customStateRules;

        if (stateBeforeCustomRules.status === "ok" && customStateRules) {
            for (const rule of customStateRules) {
                if (this._conditionMatcher.match(rule.condition, stateBeforeCustomRules)) {
                    this._status = rule.resultingStatus;
                    this._message = rule.resultingMessage;
                    break;
                }
            }
        }
    }

    updateStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
    }

    /**
     * @param {Date} now
     * @returns {StateSnapshot}
     */
    getSnapshot(now) {
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
