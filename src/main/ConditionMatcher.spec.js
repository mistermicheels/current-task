/** @typedef { import("../types/AppStateSnapshot").AppStateSnapshot } AppStateSnapshot */
/** @typedef { import("../types/Condition").Condition } Condition */

const ConditionMatcher = require("./ConditionMatcher");

/** @type {AppStateSnapshot} */
const appStateSnapshot = {
    numberOverdue: 0,
    numberOverdueMarkedCurrent: 0,
    numberOverdueNotMarkedCurrent: 0,
    numberOverdueWithTime: 0,
    numberOverdueWithTimeMarkedCurrent: 0,
    numberOverdueWithTimeNotMarkedCurrent: 0,
    numberScheduledForToday: 0,
    numberScheduledForTodayMarkedCurrent: 0,
    numberScheduledForTodayNotMarkedCurrent: 0,
    numberMarkedCurrent: 0,
    currentTaskTitle: "",
    currentTaskHasDate: false,
    currentTaskHasTime: false,
    currentTaskIsOverdue: false,
    dayOfWeek: 0,
    hours: 18,
    minutes: 15,
    seconds: 0,
    status: "ok",
    message: "Test",
    naggingEnabled: false,
    downtimeEnabled: false,
};

const conditionMatcher = new ConditionMatcher();

/** *
 * @param {Condition} condition
 * @param {boolean} result
 */
function expectResult(condition, result) {
    expect(conditionMatcher.match(condition, appStateSnapshot)).toBe(result);
}

describe("ConditionMatcher", () => {
    it("allows exactly matching numeric values", () => {
        expectResult({ hours: 18 }, true);
        expectResult({ hours: 20 }, false);
    });

    it("allows exactly matching boolean values", () => {
        expectResult({ currentTaskHasDate: false }, true);
        expectResult({ currentTaskHasDate: true }, false);
    });

    it("allows exactly matching status", () => {
        expectResult({ status: "ok" }, true);
        expectResult({ status: "warning" }, false);
    });

    it("allows matching a number against a list of numbers", () => {
        expectResult({ hours: { anyOf: [0, 10, 18] } }, true);
        expectResult({ hours: { anyOf: [10, 20, 25] } }, false);
    });

    it("allows checking that a number is less than a number", () => {
        expectResult({ hours: { lessThan: 19 } }, true);
        expectResult({ hours: { lessThan: 18 } }, false);
        expectResult({ hours: { lessThan: 17 } }, false);
    });

    it("allows checking that a number is more than a number", () => {
        expectResult({ hours: { moreThan: 17 } }, true);
        expectResult({ hours: { moreThan: 18 } }, false);
        expectResult({ hours: { moreThan: 19 } }, false);
    });

    it("allows checking that a number is a multiple of a number", () => {
        expectResult({ hours: { multipleOf: 2 } }, true);
        expectResult({ hours: { multipleOf: 5 } }, false);
    });

    it("allows checking that a number is between two numbers (start inclusive, end exclusive)", () => {
        expectResult({ hours: { fromUntil: [2, 20] } }, true);
        expectResult({ hours: { fromUntil: [16, 2] } }, true);

        expectResult({ hours: { fromUntil: [2, 16] } }, false);
        expectResult({ hours: { fromUntil: [20, 2] } }, false);

        expectResult({ hours: { fromUntil: [18, 19] } }, true);
        expectResult({ hours: { fromUntil: [17, 18] } }, false);
        expectResult({ hours: { fromUntil: [18, 18] } }, false);
    });

    it("allow combining checks against multiple properties", () => {
        expectResult({ hours: 18, minutes: 15 }, true);
        expectResult({ hours: 18, minutes: 10 }, false);
        expectResult({ hours: 20, minutes: 15 }, false);
        expectResult({ hours: 20, minutes: 10 }, false);
    });

    it("allow negating a condition", () => {
        expectResult({ not: { hours: 20 } }, true);
        expectResult({ not: { hours: 18 } }, false);
    });

    it("allow checking if one of multiple conditions is true", () => {
        expectResult({ or: [{ hours: 18 }, { hours: 20 }] }, true);
        expectResult({ or: [{ hours: 20 }, { hours: 21 }] }, false);
    });

    it("always matches an empty condition", () => {
        expectResult({}, true);
    });
});
