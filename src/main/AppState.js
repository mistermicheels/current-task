/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./ConditionMatcher") } ConditionMatcher */
/** @typedef { import("../types/AdvancedConfiguration").CustomStateRule } CustomStateRule */
/** @typedef { import("../types/StateSnapshot").StateSnapshot } StateSnapshot */
/** @typedef { import("../types/Status").Status } Status */
/** @typedef { import("../types/TasksState").TasksState } TasksState */

class AppState {
    /**
     * @param {ConditionMatcher} conditionMatcher
     * @param {CustomStateRule[]} customStateRules
     * @param {TasksState} initialTasksState
     * @param {Moment} now
     */
    constructor(conditionMatcher, customStateRules, initialTasksState, now) {
        this._conditionMatcher = conditionMatcher;
        this._customStateRules = customStateRules;
        this.updateFromTasksState(initialTasksState, now);
    }

    /**
     * @param {TasksState} tasksState
     * @param {Moment} now
     */
    updateFromTasksState(tasksState, now) {
        this._tasksState = tasksState;

        /** @type Status */
        this._status = "ok";

        if (tasksState.numberMarkedCurrent === 1) {
            this._message = tasksState.currentTaskTitle;
        } else if (tasksState.numberMarkedCurrent === 0) {
            this._message = "(no current task)";
        } else {
            this._message = `(${tasksState.numberMarkedCurrent} tasks marked current)`;
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

    /**
     * @param {Status} status
     * @param {string} message
     */
    updateStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
    }

    /**
     * @param {Moment} now
     * @returns {StateSnapshot}
     */
    getSnapshot(now) {
        return {
            dayOfWeek: now.day(),
            hours: now.hours(),
            minutes: now.minutes(),
            seconds: now.seconds(),
            ...this._tasksState,
            status: this._status,
            message: this._message,
        };
    }
}

module.exports = AppState;
