/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./ConditionMatcher") } ConditionMatcher */
/** @typedef { import("../types/Condition").Condition } Condition */
/** @typedef { import("../types/AdvancedConfiguration").CustomStateRule } CustomStateRule */
/** @typedef { import("../types/StateSnapshot").StateSnapshot } StateSnapshot */
/** @typedef { import("../types/Status").Status } Status */
/** @typedef { import("../types/TasksState").TasksState } TasksState */

class AppState {
    /**
     * @param {ConditionMatcher} conditionMatcher
     * @param {object} configuration
     * @param {CustomStateRule[]} [configuration.customStateRules]
     * @param {Condition[]} [configuration.naggingConditions]
     * @param {Condition[]} [configuration.downtimeConditions]
     */
    constructor(conditionMatcher, configuration) {
        this._conditionMatcher = conditionMatcher;
        this._customStateRules = configuration.customStateRules;
        this._naggingConditions = configuration.naggingConditions;
        this._downtimeConditions = configuration.downtimeConditions;
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

        this._applyCustomStateRules(now);
        this._applyDowntimeAndNaggingConditions(now);
    }

    _applyCustomStateRules(now) {
        if (!this._customStateRules) {
            return;
        }

        const snapshot = this.getSnapshot(now);

        for (const rule of this._customStateRules) {
            if (this._conditionMatcher.match(rule.condition, snapshot)) {
                this._status = rule.resultingStatus;
                this._message = rule.resultingMessage;
                break;
            }
        }
    }

    _applyDowntimeAndNaggingConditions(now) {
        this._downtimeEnabled = false;
        this._naggingEnabled = false;
        const snapshot = this.getSnapshot(now);

        if (this._downtimeConditions) {
            this._downtimeEnabled = this._downtimeConditions.some((condition) =>
                this._conditionMatcher.match(condition, snapshot)
            );
        }

        if (!this._downtimeEnabled && this._naggingConditions) {
            this._naggingEnabled = this._naggingConditions.some((condition) =>
                this._conditionMatcher.match(condition, snapshot)
            );
        }
    }

    /** @param {string} errorMessage */
    updateFromTaskStateError(errorMessage) {
        this._message = errorMessage;
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
            naggingEnabled: this._naggingEnabled,
            downtimeEnabled: this._downtimeEnabled,
        };
    }
}

module.exports = AppState;
