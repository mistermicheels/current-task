/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */

const CustomStateCalculator = require("./CustomStateCalculator");
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

const customStateCalculator = new CustomStateCalculator(mockConditionMatcher);

describe("CustomStateCalculator", () => {
    it("returns undefined if no rules match", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            customStateRules: [
                {
                    condition: mockFailingCondition,
                    resultingStatus: "warning",
                    resultingMessage: "Message",
                },
                {
                    condition: mockFailingCondition,
                    resultingStatus: "error",
                    resultingMessage: "Message",
                },
            ],
        };

        const customState = customStateCalculator.calculateCustomState(state, config, mockLogger);

        expect(customState).toBeUndefined();
    });

    it("returns the data from the first matching rule", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            customStateRules: [
                {
                    condition: mockFailingCondition,
                    resultingStatus: "ok",
                    resultingMessage: "Rule 1",
                    clearCurrent: false,
                },
                {
                    condition: mockPassingCondition,
                    resultingStatus: "warning",
                    resultingMessage: "Rule 2",
                    clearCurrent: true,
                },
                {
                    condition: mockPassingCondition,
                    resultingStatus: "error",
                    resultingMessage: "Rule 3",
                    clearCurrent: false,
                },
            ],
        };

        const customState = customStateCalculator.calculateCustomState(state, config, mockLogger);

        expect(customState.status).toBe("warning");
        expect(customState.message).toBe("Rule 2");
        expect(customState.shouldClearCurrent).toBe(true);
    });

    it("allows replacing parameters in the message with state properties", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            customStateRules: [
                {
                    condition: mockPassingCondition,
                    resultingStatus: "ok",
                    resultingMessage: "Hours value: %{hours}",
                },
            ],
        };

        const customState = customStateCalculator.calculateCustomState(state, config, mockLogger);

        expect(customState.message).toBe(`Hours value: ${state.hours}`);
    });

    it("ignores whitespace around parameter names in the message", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            customStateRules: [
                {
                    condition: mockPassingCondition,
                    resultingStatus: "ok",
                    resultingMessage: "Hours value: %{    \thours }",
                },
            ],
        };

        const customState = customStateCalculator.calculateCustomState(state, config, mockLogger);

        expect(customState.message).toBe(`Hours value: ${state.hours}`);
    });

    it("ignores unknown parameters in the message", () => {
        /** @type {AdvancedConfiguration} */
        const config = {
            customStateRules: [
                {
                    condition: mockPassingCondition,
                    resultingStatus: "ok",
                    resultingMessage: "Hours value: %{unknownParameter}",
                },
            ],
        };

        const customState = customStateCalculator.calculateCustomState(state, config, mockLogger);

        expect(customState.message).toBe("Hours value: %{unknownParameter}");
    });
});
