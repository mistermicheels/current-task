/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../configuration/AdvancedConfiguration").CustomStateRule } CustomStateRule */
/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("../configuration/Status").Status } Status */
/** @typedef { import("../tasks/TasksSummary").TasksSummary } TasksSummary */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */

const ConditionMatcher = require("./ConditionMatcher");
const StatusTimerData = require("./StatusTimerData");

class CalculatedState {
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
     * @param {TasksSummary} tasksSummary
     * @param {Moment} now
     */
    updateFromTasksSummary(tasksSummary, now) {
        this._logger.debugStateCalculation("Updating from tasks state:", tasksSummary);

        this._tasksSummary = tasksSummary;
        this._customStateShouldClearCurrent = false;
        this._setStatusAndMessage("ok", this._getStandardMessage(tasksSummary));
        this._updateTime(now);
        this._applyCustomStateRules();
        this._statusTimerData.updateFromCurrentStatus(this._status, now);
        this._applyDowntimeNaggingBlinkingConditions();
    }

    /**
     * @param {TasksSummary} tasksSummary
     * @param {string} errorMessage
     * @param {Moment} now
     */
    updateFromTasksSummaryError(tasksSummary, errorMessage, now) {
        this._logger.debugStateCalculation(`Updating from tasks state error: ${errorMessage}`);

        this._tasksSummary = tasksSummary;
        this._customStateShouldClearCurrent = false;
        this._setStatusAndMessage("error", errorMessage);
        this._updateTime(now);
        this._statusTimerData.updateFromCurrentStatus(this._status, now);
        this._applyDowntimeNaggingBlinkingConditions();
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

    /** @param {TasksSummary} tasksSummary */
    _getStandardMessage(tasksSummary) {
        if (tasksSummary.numberMarkedCurrent === 1) {
            return tasksSummary.currentTaskTitle;
        } else if (tasksSummary.numberMarkedCurrent === 0) {
            return "(no current task)";
        } else {
            return `(${tasksSummary.numberMarkedCurrent} tasks marked current)`;
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
            this._customStateShouldClearCurrent = !!firstMatchingRule.clearCurrent;

            this._logger.debugStateCalculation(
                "First matching custom state rule:",
                firstMatchingRule
            );
        } else {
            this._logger.debugStateCalculation("No matching custom state rule");
        }
    }

    /**
     * @param {string} messageFromRule
     * @param {CalculatedStateSnapshot} snapshot
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

    _applyDowntimeNaggingBlinkingConditions() {
        this._downtimeEnabled = false;
        this._naggingEnabled = false;
        this._blinkingEnabled = false;
        const snapshot = this.getSnapshot();

        this._applyDowntimeConditions(snapshot);

        if (this._downtimeEnabled) {
            this._logger.debugStateCalculation(
                "Ignoring nagging and blinking conditions because downtime is enabled"
            );
        } else {
            this._applyNaggingConditions(snapshot);

            if (this._naggingEnabled) {
                this._logger.debugStateCalculation(
                    "Ignoring blinking conditions because nagging is enabled"
                );
            } else {
                this._applyBlinkingConditions(snapshot);
            }
        }
    }

    /** @param {CalculatedStateSnapshot} snapshot */
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

            this._logger.debugStateCalculation(
                "First matching downtime condition:",
                firstMatchingCondition
            );
        } else {
            this._downtimeEnabled = false;
            this._logger.debugStateCalculation("No matching downtime condition");
        }
    }

    /** @param {CalculatedStateSnapshot} snapshot */
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

            this._logger.debugStateCalculation(
                "First matching nagging condition:",
                firstMatchingCondition
            );
        } else {
            this._naggingEnabled = false;
            this._logger.debugStateCalculation("No matching nagging condition");
        }
    }

    /** @param {CalculatedStateSnapshot} snapshot */
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

            this._logger.debugStateCalculation(
                "First matching blinking condition:",
                firstMatchingCondition
            );
        } else {
            this._blinkingEnabled = false;
            this._logger.debugStateCalculation("No matching blinking condition");
        }
    }

    /**
     * @param {Condition[]} conditions
     * @param {CalculatedStateSnapshot} snapshot
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
     * @returns {CalculatedStateSnapshot}
     */
    getSnapshot() {
        return {
            ...this._tasksSummary,
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
            customStateShouldClearCurrent: this._customStateShouldClearCurrent,
        };
    }

    /**
     * @returns {CalculatedStateSnapshot}
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

module.exports = CalculatedState;
