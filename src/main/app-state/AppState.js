/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../configuration/AdvancedConfiguration").CustomStateRule } CustomStateRule */
/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("../configuration/Status").Status } Status */
/** @typedef { import("../tasks-state/TasksState").TasksState } TasksState */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./AppStateSnapshot").AppStateSnapshot } AppStateSnapshot */

const ConditionMatcher = require("./ConditionMatcher");
const StatusTimerData = require("./StatusTimerData");

class AppState {
    /**
     * @param {AdvancedConfiguration} configuration
     * @param {Logger} logger
     * r@param {Moment} now
     */
    constructor(configuration, logger, now) {
        this._conditionMatcher = new ConditionMatcher();
        this.updateConfiguration(configuration);
        this._logger = logger;

        this._statusTimerData = new StatusTimerData(now);
    }

    /**
     * @param {AdvancedConfiguration} configuration
     */
    updateConfiguration(configuration) {
        this._customStateRules = configuration.customStateRules;
        this._naggingConditions = configuration.naggingConditions;
        this._blinkingConditions = configuration.blinkingConditions;
        this._downtimeConditions = configuration.downtimeConditions;
    }

    /** @param {Moment} now */
    resetStatusTimers(now) {
        this._statusTimerData.reset(now);
    }

    /**
     * @param {TasksState} tasksState
     * @param {Moment} now
     */
    updateFromTasksState(tasksState, now) {
        this._logger.debugAppState("Updating from tasks state:", tasksState);

        this._tasksState = tasksState;
        this._setStatusAndMessage("ok", this._getStandardMessage(tasksState));
        this._updateTime(now);
        this._applyCustomStateRules();
        this._updateStatusTimersAndApplyConditions(now);
    }

    /**
     * @param {TasksState} tasksState
     * @param {string} errorMessage
     * @param {Moment} now
     */
    updateFromTasksStateError(tasksState, errorMessage, now) {
        this._logger.debugAppState(`Updating from tasks state error: ${errorMessage}`);

        this._tasksState = tasksState;
        this._setStatusAndMessage("error", errorMessage);
        this._updateTime(now);
        this._updateStatusTimersAndApplyConditions(now);
    }

    /**
     * @param {Status} status
     * @param {string} message
     */
    _setStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
    }

    /** @param {Moment} now */
    _updateTime(now) {
        this._dayOfWeek = now.day();
        this._hours = now.hours();
        this._minutes = now.minutes();
        this._seconds = now.seconds();
    }

    /** @param {TasksState} tasksState */
    _getStandardMessage(tasksState) {
        if (tasksState.numberMarkedCurrent === 1) {
            return tasksState.currentTaskTitle;
        } else if (tasksState.numberMarkedCurrent === 0) {
            return "(no current task)";
        } else {
            return `(${tasksState.numberMarkedCurrent} tasks marked current)`;
        }
    }

    _applyCustomStateRules() {
        if (!this._customStateRules) {
            return;
        }

        // custom state rules determine status and can therefore not be based on status (or related data)
        const snapshot = this._getSnapshotWithStatusPlaceholders();

        let firstMatchingRule = undefined;

        for (const rule of this._customStateRules) {
            if (this._conditionMatcher.match(rule.condition, snapshot)) {
                firstMatchingRule = rule;
                break;
            }
        }

        if (firstMatchingRule) {
            this._status = firstMatchingRule.resultingStatus;
            const messageFromRule = firstMatchingRule.resultingMessage;
            this._message = this._getFullCustomMessage(messageFromRule, snapshot);
            this._logger.debugAppState("First matching custom state rule:", firstMatchingRule);
        } else {
            this._logger.debugAppState("No matching custom state rule");
        }
    }

    /**
     * @param {string} messageFromRule
     * @param {AppStateSnapshot} snapshot
     */
    _getFullCustomMessage(messageFromRule, snapshot) {
        const messageParameterRegex = /%{\s*(\w+)\s*}/g;

        return messageFromRule.replace(messageParameterRegex, (fullMatch, parameterName) => {
            if (snapshot.hasOwnProperty(parameterName)) {
                return snapshot[parameterName];
            } else {
                return fullMatch;
            }
        });
    }

    /** @param {Moment} now */
    _updateStatusTimersAndApplyConditions(now) {
        // update timers so conditions can take them into account
        this._statusTimerData.updateFromCurrentStatus(this._status, now);

        this._applyDowntimeNaggingBlinkingConditions();
    }

    _applyDowntimeNaggingBlinkingConditions() {
        this._downtimeEnabled = false;
        this._naggingEnabled = false;
        this._blinkingEnabled = false;
        const snapshot = this.getSnapshot();

        this._applyDowntimeConditions(snapshot);

        if (this._downtimeEnabled) {
            this._logger.debugAppState(
                "Ignoring nagging and blinking conditions because downtime is enabled"
            );
        } else {
            this._applyNaggingConditions(snapshot);

            if (this._naggingEnabled) {
                this._logger.debugAppState(
                    "Ignoring blinking conditions because nagging is enabled"
                );
            } else {
                this._applyBlinkingConditions(snapshot);
            }
        }
    }

    /** @param {AppStateSnapshot} snapshot */
    _applyDowntimeConditions(snapshot) {
        if (!this._downtimeConditions) {
            return;
        }

        const firstMatchingCondition = this._getFirstMatchingCondition(
            this._downtimeConditions,
            snapshot
        );

        if (firstMatchingCondition) {
            this._downtimeEnabled = true;

            this._logger.debugAppState(
                "First matching downtime condition:",
                firstMatchingCondition
            );
        } else {
            this._downtimeEnabled = false;
            this._logger.debugAppState("No matching downtime condition");
        }
    }

    /** @param {AppStateSnapshot} snapshot */
    _applyNaggingConditions(snapshot) {
        if (!this._naggingConditions) {
            return;
        }

        const firstMatchingCondition = this._getFirstMatchingCondition(
            this._naggingConditions,
            snapshot
        );

        if (firstMatchingCondition) {
            this._naggingEnabled = true;
            this._logger.debugAppState("First matching nagging condition:", firstMatchingCondition);
        } else {
            this._naggingEnabled = false;
            this._logger.debugAppState("No matching nagging condition");
        }
    }

    /** @param {AppStateSnapshot} snapshot */
    _applyBlinkingConditions(snapshot) {
        if (!this._blinkingConditions) {
            return;
        }

        const firstMatchingCondition = this._getFirstMatchingCondition(
            this._blinkingConditions,
            snapshot
        );

        if (firstMatchingCondition) {
            this._blinkingEnabled = true;

            this._logger.debugAppState(
                "First matching blinking condition:",
                firstMatchingCondition
            );
        } else {
            this._blinkingEnabled = false;
            this._logger.debugAppState("No matching blinking condition");
        }
    }

    /**
     * @param {Condition[]} conditions
     * @param {AppStateSnapshot} snapshot
     */
    _getFirstMatchingCondition(conditions, snapshot) {
        let firstMatchingCondition = undefined;

        for (const condition of conditions) {
            if (this._conditionMatcher.match(condition, snapshot)) {
                firstMatchingCondition = condition;
                break;
            }
        }

        return firstMatchingCondition;
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
            secondsInCurrentStatus: this._statusTimerData.getSecondsInCurrentStatus(),
            secondsSinceOkStatus: this._statusTimerData.getSecondsSinceOkStatus(),
            naggingEnabled: this._naggingEnabled,
            blinkingEnabled: this._blinkingEnabled,
            downtimeEnabled: this._downtimeEnabled,
        };
    }

    /**
     * @returns {AppStateSnapshot}
     */
    _getSnapshotWithStatusPlaceholders() {
        return {
            ...this.getSnapshot(),
            status: "ok",
            secondsInCurrentStatus: 0,
            secondsSinceOkStatus: 0,
        };
    }
}

module.exports = AppState;
