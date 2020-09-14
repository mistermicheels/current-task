/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./ConditionMatcher") } ConditionMatcher */
/** @typedef { import("../types/AdvancedConfiguration").CustomStateRule } CustomStateRule */
/** @typedef { import("../types/AppStateSnapshot").AppStateSnapshot } AppStateSnapshot */
/** @typedef { import("../types/Condition").Condition } Condition */
/** @typedef { import("../types/Status").Status } Status */
/** @typedef { import("../types/TasksState").TasksState } TasksState */

/**
 * @typedef {object} ConfigurationObject
 * @property {CustomStateRule[]} [customStateRules]
 * @property {Condition[]} [naggingConditions]
 * @property {Condition[]} [downtimeConditions]
 */

class AppState {
    /**
     * @param {ConditionMatcher} conditionMatcher
     * @param {ConfigurationObject} configuration
     */
    constructor(conditionMatcher, configuration) {
        this._conditionMatcher = conditionMatcher;
        this.updateConfiguration(configuration);
    }

    /**
     * @param {ConfigurationObject} configuration
     */
    updateConfiguration(configuration) {
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
        this._updateTime(now);

        /** @type Status */
        this._status = "ok";

        if (tasksState.numberMarkedCurrent === 1) {
            this._message = tasksState.currentTaskTitle;
        } else if (tasksState.numberMarkedCurrent === 0) {
            this._message = "(no current task)";
        } else {
            this._message = `(${tasksState.numberMarkedCurrent} tasks marked current)`;
        }

        this._applyCustomStateRules();
        this._applyDowntimeAndNaggingConditions();
    }

    _updateTime(now) {
        this._dayOfWeek = now.day();
        this._hours = now.hours();
        this._minutes = now.minutes();
        this._seconds = now.seconds();
    }

    _applyCustomStateRules() {
        if (!this._customStateRules) {
            return;
        }

        const snapshot = this.getSnapshot();

        for (const rule of this._customStateRules) {
            if (this._conditionMatcher.match(rule.condition, snapshot)) {
                this._status = rule.resultingStatus;
                this._message = this._determineMessage(rule.resultingMessage, snapshot);
                break;
            }
        }
    }

    /**
     * @param {string} messageFromRule
     * @param {AppStateSnapshot} snapshot
     */
    _determineMessage(messageFromRule, snapshot) {
        const messageParameterRegex = /%{\s*(\w+)\s*}/g;

        return messageFromRule.replace(messageParameterRegex, (fullMatch, parameterName) => {
            if (snapshot.hasOwnProperty(parameterName)) {
                return snapshot[parameterName];
            } else {
                return fullMatch;
            }
        });
    }

    _applyDowntimeAndNaggingConditions() {
        this._downtimeEnabled = false;
        this._naggingEnabled = false;
        const snapshot = this.getSnapshot();

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

    /**
     * @param {TasksState} tasksState
     * @param {string} errorMessage
     * @param {Moment} now
     */
    updateFromTasksStateError(tasksState, errorMessage, now) {
        this._tasksState = tasksState;
        this._status = "error";
        this._message = errorMessage;
        this._updateTime(now);
        this._applyDowntimeAndNaggingConditions();
    }

    /**
     * @returns {AppStateSnapshot}
     */
    getSnapshot() {
        return {
            ...this._tasksState,
            dayOfWeek: this._dayOfWeek,
            hours: this._hours,
            minutes: this._minutes,
            seconds: this._seconds,
            status: this._status,
            message: this._message,
            naggingEnabled: this._naggingEnabled,
            downtimeEnabled: this._downtimeEnabled,
        };
    }
}

module.exports = AppState;
