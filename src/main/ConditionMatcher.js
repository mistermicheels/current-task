/** @typedef { import("../types/AppStateSnapshot").AppStateSnapshot } AppStateSnapshot */
/** @typedef { import("../types/Condition").Condition } Condition */
/** @typedef { import("../types/Condition").NumericValueOperatorsCondition } NumericValueOperatorsCondition */
/** @typedef { import("../types/Condition").ValueCondition } ValueCondition */

class ConditionMatcher {
    /**
     * @param {Condition} condition
     * @param {AppStateSnapshot} state
     */
    match(condition, state) {
        const {
            not: notCondition,
            or: orConditions,
            and: andConditions,
            ...valueConditions
        } = condition;

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

        if (orConditions && !orConditions.some((item) => this.match(item, state))) {
            return false;
        }

        if (andConditions && !andConditions.every((item) => this.match(item, state))) {
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
            return this._matchExactValue(valueCondition, value);
        }

        return (
            this._matchAnyOf(valueCondition, value) &&
            this._matchLessThan(valueCondition, value) &&
            this._matchMoreThan(valueCondition, value) &&
            this._matchMultipleOf(valueCondition, value) &&
            this._matchFromUntil(valueCondition, value)
        );
    }

    /**
     * @param {Exclude<ValueCondition, NumericValueOperatorsCondition>} valueCondition
     * @param {any} value
     */
    _matchExactValue(valueCondition, value) {
        return value === valueCondition;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {any} value
     */
    _matchAnyOf(valueCondition, value) {
        if (valueCondition.anyOf === undefined) {
            return true;
        }

        return valueCondition.anyOf.includes(value);
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {any} value
     */
    _matchLessThan(valueCondition, value) {
        if (valueCondition.lessThan === undefined) {
            return true;
        }

        return valueCondition.lessThan > value;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {any} value
     */
    _matchMoreThan(valueCondition, value) {
        if (valueCondition.moreThan === undefined) {
            return true;
        }

        return valueCondition.moreThan < value;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {any} value
     */
    _matchMultipleOf(valueCondition, value) {
        if (valueCondition.multipleOf === undefined) {
            return true;
        }

        return value % valueCondition.multipleOf === 0;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {any} value
     */
    _matchFromUntil(valueCondition, value) {
        if (valueCondition.fromUntil === undefined) {
            return true;
        }

        const start = valueCondition.fromUntil[0];
        const end = valueCondition.fromUntil[1];

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
