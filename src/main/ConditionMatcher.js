class ConditionMatcher {
    match(condition, state) {
        const { not: notCondition, or: orConditions, ...valueConditions } = condition;

        for (const [key, valueCondition] of Object.entries(valueConditions)) {
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

    _matchValue(valueCondition, value) {
        if (typeof valueCondition !== "object") {
            return value === valueCondition;
        }

        if (valueCondition.anyOf) {
            return valueCondition.anyOf.includes(value);
        }

        if (valueCondition.lessThan) {
            return valueCondition.lessThan > value;
        }

        if (valueCondition.moreThan) {
            return valueCondition.moreThan < value;
        }

        if (valueCondition.fromUntil) {
            return this._matchFromUntil(valueCondition.fromUntil, value);
        }
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
