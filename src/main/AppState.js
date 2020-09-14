/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./ConditionMatcher") } ConditionMatcher */
/** @typedef { import("./Logger") } Logger */
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
     * @param {Logger} logger
     */
    constructor(conditionMatcher, configuration, logger) {
        this._conditionMatcher = conditionMatcher;
        this.updateConfiguration(configuration);
        this._logger = logger;
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
        this._logger.debug("Updating from tasks state:", tasksState);

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
        let firstMatchingRule = undefined;

        for (const rule of this._customStateRules) {
            if (this._conditionMatcher.match(rule.condition, snapshot)) {
                firstMatchingRule = rule;
                break;
            }
        }

        if (firstMatchingRule) {
            this._status = firstMatchingRule.resultingStatus;
            this._message = this._determineMessage(firstMatchingRule.resultingMessage, snapshot);
            this._logger.debug("First matching custom state rule:", firstMatchingRule);
        } else {
            this._logger.debug("No matching custom state rule");
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

        this._applyDowntimeConditions(snapshot);

        if (this._downtimeEnabled) {
            this._logger.debug("Ignoring nagging conditions because downtime is enabled");
        } else {
            this._applyNaggingConditions(snapshot);
        }
    }

    /** @param {AppStateSnapshot} snapshot */
    _applyDowntimeConditions(snapshot) {
        if (!this._downtimeConditions) {
            return;
        }

        let firstMatchingCondition = undefined;

        for (const condition of this._downtimeConditions) {
            if (this._conditionMatcher.match(condition, snapshot)) {
                firstMatchingCondition = condition;
                break;
            }
        }

        if (firstMatchingCondition) {
            this._downtimeEnabled = true;
            this._logger.debug("First matching downtime condition:", firstMatchingCondition);
        } else {
            this._downtimeEnabled = false;
            this._logger.debug("No matching downtime condition");
        }
    }

    /** @param {AppStateSnapshot} snapshot */
    _applyNaggingConditions(snapshot) {
        if (!this._naggingConditions) {
            return;
        }

        let firstMatchingCondition = undefined;

        for (const condition of this._naggingConditions) {
            if (this._conditionMatcher.match(condition, snapshot)) {
                firstMatchingCondition = condition;
                break;
            }
        }

        if (firstMatchingCondition) {
            this._naggingEnabled = true;
            this._logger.debug("First matching nagging condition:", firstMatchingCondition);
        } else {
            this._naggingEnabled = false;
            this._logger.debug("No matching nagging condition");
        }
    }

    /**
     * @param {TasksState} tasksState
     * @param {string} errorMessage
     * @param {Moment} now
     */
    updateFromTasksStateError(tasksState, errorMessage, now) {
        this._logger.debug(`Updating from tasks state error: ${errorMessage}`);

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
