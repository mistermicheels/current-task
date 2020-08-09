//@ts-check

/** @typedef { import("../types/Condition").Condition } Condition */
/** @typedef { import("../types/Condition").ValueCondition } ValueCondition */
/** @typedef { import("../types/StateSnapshot").StateSnapshot } StateSnapshot */

class ConditionMatcher {
    /**
     * @param {Condition} condition
     * @param {StateSnapshot} state
     */
    match(condition, state) {
        const { not: notCondition, or: orConditions, ...valueConditions } = condition;

        for (const key in valueConditions) {
            const valueCondition = valueConditions[key];
            const value = state[key];

            if (!this._matchValue(valueCondition, value)) {
                return false;
            }
        }

        if (notCondition && this.match(notCondition, state)) {
            return false;
        }

        if (orConditions && orConditions.every((orCondition) => !this.match(orCondition, state))) {
            return false;
        }

        return true;
    }

    /**
     * @param {ValueCondition} valueCondition
     * @param {any} value
     */
    _matchValue(valueCondition, value) {
        if (typeof valueCondition !== "object") {
            return value === valueCondition;
        }

        if ("anyOf" in valueCondition) {
            return valueCondition.anyOf.includes(value);
        }

        if ("lessThan" in valueCondition) {
            return valueCondition.lessThan > value;
        }

        if ("moreThan" in valueCondition) {
            return valueCondition.moreThan < value;
        }

        if ("multipleOf" in valueCondition) {
            return value % valueCondition.multipleOf === 0;
        }

        if ("fromUntil" in valueCondition) {
            return this._matchFromUntil(valueCondition.fromUntil, value);
        }

        return true;
    }

    _matchFromUntil(fromUntil, value) {
        const start = fromUntil[0];
        const end = fromUntil[1];

        if (start === end) {
            return false;
        } else if (start < end) {
            return value >= start && value < end;
        } else {
            return value >= start || value < end;
        }
    }
}

module.exports = ConditionMatcher;
