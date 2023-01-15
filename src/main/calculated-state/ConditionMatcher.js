/** @typedef { import("../calendar-events/CalendarEvent").CalendarEventWithCalendarName } CalendarEventWithCalendarName */
/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("../configuration/Condition").NumericValueOperatorsCondition } NumericValueOperatorsCondition */
/** @typedef { import("../configuration/Condition").StringValueOperatorsCondition } StringValueOperatorsCondition */
/** @typedef { import("../configuration/Condition").ActiveCalendarEventConditions } ActiveCalendarEventConditions */
/** @typedef { import("../configuration/Condition").ValueCondition } ValueCondition */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */

class ConditionMatcher {
    /**
     * @param {Condition} condition
     * @param {CalculatedStateSnapshot} state
     */
    match(condition, state) {
        const {
            not: notCondition,
            or: orConditions,
            and: andConditions,
            activeCalendarEvent,
            ...valueConditions
        } = condition;

        if (!this._matchConditions({ ...valueConditions }, state)) {
            return false;
        }

        if (activeCalendarEvent && !this._matchActiveCalendarEvent(activeCalendarEvent, state)) {
            return false;
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
     *
     * @param {{ [key: string]: ValueCondition }} conditionsObject
     * @param {object} subject
     * @returns
     */
    _matchConditions(conditionsObject, subject) {
        for (const key in conditionsObject) {
            const valueCondition = conditionsObject[key];
            const value = subject[key];

            if (!this._matchValue(valueCondition, value)) {
                return false;
            }
        }

        return true;
    }

    /**
     *
     * @param {ActiveCalendarEventConditions} conditions
     * @param {CalculatedStateSnapshot} state
     */
    _matchActiveCalendarEvent(conditions, state) {
        return state.activeCalendarEvents.some((event) => {
            return this._matchSingleEvent(conditions, event);
        });
    }

    /**
     * @param {ActiveCalendarEventConditions} conditions
     * @param {CalendarEventWithCalendarName} event
     */
    _matchSingleEvent(conditions, event) {
        const {
            not: notCondition,
            or: orConditions,
            and: andConditions,
            ...valueConditions
        } = conditions;

        if (!this._matchConditions({ ...valueConditions }, event)) {
            return false;
        }

        if (notCondition && this._matchSingleEvent(notCondition, event)) {
            return false;
        }

        if (orConditions && !orConditions.some((item) => this._matchSingleEvent(item, event))) {
            return false;
        }

        if (andConditions && !andConditions.every((item) => this._matchSingleEvent(item, event))) {
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

        if (typeof value === "number") {
            const numberCondition = /** @type {NumericValueOperatorsCondition} */ (valueCondition);

            return (
                this._matchNumberAnyOf(numberCondition, value) &&
                this._matchNumberLessThan(numberCondition, value) &&
                this._matchNumberMoreThan(numberCondition, value) &&
                this._matchNumberMultipleOf(numberCondition, value) &&
                this._matchNumberFromUntil(numberCondition, value)
            );
        }

        if (typeof value === "string") {
            const stringCondition = /** @type {StringValueOperatorsCondition} */ (valueCondition);

            return (
                this._matchStringAnyOf(stringCondition, value) &&
                this._matchStringContains(stringCondition, value)
            );
        }

        return false;
    }

    /**
     * @param {Exclude<ValueCondition, NumericValueOperatorsCondition | StringValueOperatorsCondition>} valueCondition
     * @param {any} value
     */
    _matchExactValue(valueCondition, value) {
        return value === valueCondition;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {number} value
     */
    _matchNumberAnyOf(valueCondition, value) {
        if (valueCondition.anyOf === undefined) {
            return true;
        }

        return valueCondition.anyOf.includes(value);
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {number} value
     */
    _matchNumberLessThan(valueCondition, value) {
        if (valueCondition.lessThan === undefined) {
            return true;
        }

        return valueCondition.lessThan > value;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {number} value
     */
    _matchNumberMoreThan(valueCondition, value) {
        if (valueCondition.moreThan === undefined) {
            return true;
        }

        return valueCondition.moreThan < value;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {number} value
     */
    _matchNumberMultipleOf(valueCondition, value) {
        if (valueCondition.multipleOf === undefined) {
            return true;
        }

        return value % valueCondition.multipleOf === 0;
    }

    /**
     * @param {NumericValueOperatorsCondition} valueCondition
     * @param {number} value
     */
    _matchNumberFromUntil(valueCondition, value) {
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

    /**
     * @param {StringValueOperatorsCondition} valueCondition
     * @param {string} value
     */
    _matchStringAnyOf(valueCondition, value) {
        if (valueCondition.anyOf === undefined) {
            return true;
        }

        return valueCondition.anyOf.includes(value);
    }

    /**
     * @param {StringValueOperatorsCondition} valueCondition
     * @param {string} value
     */
    _matchStringContains(valueCondition, value) {
        if (valueCondition.contains === undefined) {
            return true;
        }

        return value.includes(valueCondition.contains);
    }
}

module.exports = ConditionMatcher;
