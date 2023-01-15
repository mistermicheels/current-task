/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */

const ConditionMatcher = require("./ConditionMatcher");

/** @type {CalculatedStateSnapshot} */
const calculatedStateSnapshot = {
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
    currentTaskIsScheduledForToday: false,
    activeCalendarEvents: [
        {
            summary: "Event 1",
            location: "",
            start: new Date(),
            end: new Date(),
            isAllDay: false,
            calendar: "Personal",
        },
        {
            summary: "Event 2",
            location: "Actual location",
            start: new Date(),
            end: new Date(),
            isAllDay: false,
            calendar: "Personal",
        },
    ],
    dayOfWeek: 0,
    hours: 18,
    minutes: 15,
    seconds: 0,
    status: "ok",
    message: "Test",
    secondsInCurrentStatus: 0,
    secondsSinceOkStatus: 0,
    naggingEnabled: false,
    blinkingEnabled: false,
    downtimeEnabled: false,
    customStateShouldClearCurrent: false,
};

const conditionMatcher = new ConditionMatcher();

/** *
 * @param {Condition} condition
 * @param {boolean} result
 */
function expectResult(condition, result) {
    expect(conditionMatcher.match(condition, calculatedStateSnapshot)).toBe(result);
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

    it("allows combining multiple operators for a single numerical property", () => {
        expectResult({ hours: { moreThan: 17, lessThan: 19 } }, true);
        expectResult({ hours: { moreThan: 18, lessThan: 19 } }, false);
    });

    it("always matches an empty operators object for a numerical property", () => {
        expectResult({ hours: {} }, true);
    });

    it("allows negating a condition using 'not'", () => {
        expectResult({ not: { hours: 20 } }, true);
        expectResult({ not: { hours: 18 } }, false);
    });

    it("allows combining multiple conditions using 'or'", () => {
        expectResult({ or: [{ hours: 18 }, { hours: 20 }] }, true);
        expectResult({ or: [{ hours: 20 }, { hours: 21 }] }, false);
    });

    it("allows combining multiple conditions using 'and'", () => {
        expectResult({ and: [{ hours: { multipleOf: 2 } }, { hours: { multipleOf: 3 } }] }, true);
        expectResult({ and: [{ hours: { multipleOf: 3 } }, { hours: { multipleOf: 5 } }] }, false);
    });

    it("always matches an empty condition", () => {
        expectResult({}, true);
    });

    it("allows matching any active calendar event", () => {
        expectResult({ activeCalendarEvent: {} }, true);
        expectResult({ not: { activeCalendarEvent: {} } }, false);
    });

    it("allows exactly matching active calendar event properties", () => {
        expectResult({ activeCalendarEvent: { summary: "Event 1" } }, true);
        expectResult({ activeCalendarEvent: { summary: "Event 3" } }, false);

        expectResult({ activeCalendarEvent: { summary: "Event 1", isAllDay: false } }, true);
        expectResult({ activeCalendarEvent: { summary: "Event 1", isAllDay: true } }, false);
    });

    it("allows matching active calendar event properties against a list of strings", () => {
        expectResult({ activeCalendarEvent: { summary: { anyOf: ["Event 1", "Event 3"] } } }, true);
        expectResult({ activeCalendarEvent: { summary: { anyOf: ["Foo", "Bar"] } } }, false);
    });

    it("allows checking that an active calendar event property contains a given string", () => {
        expectResult({ activeCalendarEvent: { location: { contains: "Actual" } } }, true);
        expectResult({ activeCalendarEvent: { location: { contains: "Real" } } }, false);
    });
});
