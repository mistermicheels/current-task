/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../configuration/Status").Status } Status */
/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */
/** @typedef { import("./ConditionMatcher") } ConditionMatcher */

class CustomStateCalculator {
    /**
     * @param {ConditionMatcher} conditionMatcher
     */
    constructor(conditionMatcher) {
        this._conditionMatcher = conditionMatcher;
    }

    /**
     * @param {CalculatedStateSnapshot} stateSnapshot
     * @param {AdvancedConfiguration} configuration
     * @param {Logger} logger
     * @returns {{ status: Status, message: string, shouldClearCurrent: boolean }}
     */
    calculateCustomState(stateSnapshot, configuration, logger) {
        if (!configuration.customStateRules) {
            return undefined;
        }

        let firstMatchingRule = undefined;

        for (const rule of configuration.customStateRules) {
            if (this._conditionMatcher.match(rule.condition, stateSnapshot)) {
                firstMatchingRule = rule;
                break;
            }
        }

        if (firstMatchingRule) {
            logger.debugStateCalculation("First matching custom state rule:", firstMatchingRule);

            const status = firstMatchingRule.resultingStatus;
            const messageFromRule = firstMatchingRule.resultingMessage;
            const message = this._getCustomMessage(messageFromRule, stateSnapshot);
            const shouldClearCurrent = !!firstMatchingRule.clearCurrent;

            return { status, message, shouldClearCurrent };
        } else {
            logger.debugStateCalculation("No matching custom state rule");
            return undefined;
        }
    }

    /**
     * @param {string} messageFromRule
     * @param {CalculatedStateSnapshot} snapshot
     */
    _getCustomMessage(messageFromRule, snapshot) {
        const messageParameterRegex = /%{\s*(\w+)\s*}/g;

        return messageFromRule.replace(messageParameterRegex, (fullMatch, parameterName) => {
            if (snapshot.hasOwnProperty(parameterName)) {
                return snapshot[parameterName];
            } else {
                return fullMatch;
            }
        });
    }
}

module.exports = CustomStateCalculator;
