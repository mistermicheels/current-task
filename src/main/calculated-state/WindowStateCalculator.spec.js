/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */

const WindowStateCalculator = require("./WindowStateCalculator");
const ConditionMatcher = require("./ConditionMatcher");
const Logger = require("../Logger");

jest.mock("./ConditionMatcher");
jest.mock("../Logger");

const mockPassingCondition = {};
const mockFailingCondition = {};

// @ts-ignore
ConditionMatcher.mockImplementation(() => {
    return {
        match: jest.fn().mockImplementation((condition, _state) => {
            return condition === mockPassingCondition;
        }),
    };
});

const mockConditionMatcher = new ConditionMatcher();
const mockLogger = new Logger();

/** @type {CalculatedStateSnapshot} */
const state = {
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
    activeCalendarEvents: [],
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

const windowStateCalculator = new WindowStateCalculator(mockConditionMatcher);

describe("WindowStateCalculator", () => {
    it("returns false for all flags if no conditions match", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            naggingConditions: [mockFailingCondition],
            downtimeConditions: [mockFailingCondition],
        };

        const windowState = windowStateCalculator.calculateWindowState(state, config, mockLogger);

        expect(windowState.downtimeEnabled).toBe(false);
        expect(windowState.naggingEnabled).toBe(false);
        expect(windowState.blinkingEnabled).toBe(false);
    });

    it("applies downtime conditions", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            downtimeConditions: [mockPassingCondition],
        };

        const windowState = windowStateCalculator.calculateWindowState(state, config, mockLogger);

        expect(windowState.downtimeEnabled).toBe(true);
        expect(windowState.naggingEnabled).toBe(false);
        expect(windowState.blinkingEnabled).toBe(false);
    });

    it("applies nagging conditions", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            naggingConditions: [mockFailingCondition, mockPassingCondition],
        };

        const windowState = windowStateCalculator.calculateWindowState(state, config, mockLogger);

        expect(windowState.downtimeEnabled).toBe(false);
        expect(windowState.naggingEnabled).toBe(true);
        expect(windowState.blinkingEnabled).toBe(false);
    });

    it("applies blinking conditions", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            blinkingConditions: [mockPassingCondition, mockFailingCondition],
        };

        const windowState = windowStateCalculator.calculateWindowState(state, config, mockLogger);

        expect(windowState.downtimeEnabled).toBe(false);
        expect(windowState.naggingEnabled).toBe(false);
        expect(windowState.blinkingEnabled).toBe(true);
    });

    it("ignores nagging and blinking if downtime is enabled", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            downtimeConditions: [mockPassingCondition],
            naggingConditions: [mockPassingCondition],
            blinkingConditions: [mockPassingCondition],
        };

        const windowState = windowStateCalculator.calculateWindowState(state, config, mockLogger);

        expect(windowState.downtimeEnabled).toBe(true);
        expect(windowState.naggingEnabled).toBe(false);
        expect(windowState.blinkingEnabled).toBe(false);
    });

    it("ignores blinking if nagging is enabled", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            downtimeConditions: [mockFailingCondition],
            naggingConditions: [mockPassingCondition],
            blinkingConditions: [mockPassingCondition],
        };

        const windowState = windowStateCalculator.calculateWindowState(state, config, mockLogger);

        expect(windowState.downtimeEnabled).toBe(false);
        expect(windowState.naggingEnabled).toBe(true);
        expect(windowState.blinkingEnabled).toBe(false);
    });
});
