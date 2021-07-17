/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */
/** @typedef { import("./ConditionMatcher") } ConditionMatcher */
/** @typedef { import("./WindowState").WindowState } WindowState */

class WindowStateCalculator {
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
     * @returns {WindowState}
     */
    calculateWindowState(stateSnapshot, configuration, logger) {
        let downtimeEnabled = false;
        let naggingEnabled = false;
        let blinkingEnabled = false;

        downtimeEnabled = this._shouldEnableDowntime(stateSnapshot, configuration, logger);

        if (downtimeEnabled) {
            logger.debugStateCalculation(
                "Ignoring nagging and blinking conditions because downtime is enabled"
            );
        } else {
            naggingEnabled = this._shouldEnableNagging(stateSnapshot, configuration, logger);

            if (naggingEnabled) {
                logger.debugStateCalculation(
                    "Ignoring blinking conditions because nagging is enabled"
                );
            } else {
                blinkingEnabled = this._shouldEnableBlinking(stateSnapshot, configuration, logger);
            }
        }

        return { downtimeEnabled, naggingEnabled, blinkingEnabled };
    }

    /**
     * @param {CalculatedStateSnapshot} stateSnapshot
     * @param {AdvancedConfiguration} configuration
     * @param {Logger} logger
     */
    _shouldEnableDowntime(stateSnapshot, configuration, logger) {
        if (!configuration.downtimeConditions) {
            return false;
        }

        const firstMatchingCondition = configuration.downtimeConditions.find((condition) =>
            this._conditionMatcher.match(condition, stateSnapshot)
        );

        if (firstMatchingCondition) {
            logger.debugStateCalculation(
                "First matching downtime condition:",
                firstMatchingCondition
            );

            return true;
        } else {
            logger.debugStateCalculation("No matching downtime condition");
            return false;
        }
    }

    /**
     * @param {CalculatedStateSnapshot} stateSnapshot
     * @param {AdvancedConfiguration} configuration
     * @param {Logger} logger
     */
    _shouldEnableNagging(stateSnapshot, configuration, logger) {
        if (!configuration.naggingConditions) {
            return false;
        }

        const firstMatchingCondition = configuration.naggingConditions.find((condition) =>
            this._conditionMatcher.match(condition, stateSnapshot)
        );

        if (firstMatchingCondition) {
            logger.debugStateCalculation(
                "First matching nagging condition:",
                firstMatchingCondition
            );

            return true;
        } else {
            logger.debugStateCalculation("No matching nagging condition");
            return false;
        }
    }

    /**
     * @param {CalculatedStateSnapshot} stateSnapshot
     * @param {AdvancedConfiguration} configuration
     * @param {Logger} logger
     */
    _shouldEnableBlinking(stateSnapshot, configuration, logger) {
        if (!configuration.blinkingConditions) {
            return false;
        }

        const firstMatchingCondition = configuration.blinkingConditions.find((condition) =>
            this._conditionMatcher.match(condition, stateSnapshot)
        );

        if (firstMatchingCondition) {
            logger.debugStateCalculation(
                "First matching blinking condition:",
                firstMatchingCondition
            );

            return true;
        } else {
            logger.debugStateCalculation("No matching blinking condition");
            return false;
        }
    }
}

module.exports = WindowStateCalculator;
