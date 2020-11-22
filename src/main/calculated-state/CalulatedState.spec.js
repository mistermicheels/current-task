/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../tasks/TasksSummary").TasksSummary } TasksSummary */

const moment = require("moment");

const Logger = require("../Logger");

const CalculatedState = require("./CalculatedState");
const ConditionMatcher = require("./ConditionMatcher");

jest.mock("../Logger");
jest.mock("./ConditionMatcher");

const mockPassingCondition = {};
const mockFailingCondition = {};

const mockMatchFunction = jest.fn().mockImplementation((condition, _state) => {
    return condition === mockPassingCondition;
});

// @ts-ignore
ConditionMatcher.mockImplementation(() => {
    return {
        match: mockMatchFunction,
    };
});

const mockLogger = new Logger();

const now = moment("2020-09-19 14:05:10");

/** @type {TasksSummary} */
const baseTasksSummary = {
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
};

describe("CalculatedState", () => {
    describe("the default behavior", () => {
        it("sets the message to the current task's title if there is exactly one", () => {
            const config = {};
            const calculatedState = new CalculatedState(config, mockLogger, now);

            const tasksSummary = {
                ...baseTasksSummary,
                numberMarkedCurrent: 1,
                currentTaskTitle: "Test",
            };

            calculatedState.updateFromTasksSummary(tasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe(tasksSummary.currentTaskTitle);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("indicates if there is no current task", () => {
            const config = {};
            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe("(no current task)");
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("indicates if there are multiple tasks marked current", () => {
            const config = {};
            const calculatedState = new CalculatedState(config, mockLogger, now);

            const tasksSummary = {
                ...baseTasksSummary,
                numberMarkedCurrent: 3,
                currentTaskTitle: "",
            };

            calculatedState.updateFromTasksSummary(tasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe("(3 tasks marked current)");
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("sets status to error for a tasks error", () => {
            const config = {};
            const calculatedState = new CalculatedState(config, mockLogger, now);

            const errorMessage = "errorMessage";
            calculatedState.updateFromTasksError(baseTasksSummary, errorMessage, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("error");
            expect(snapshot.message).toBe(errorMessage);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });
    });

    describe("custom state rules handling", () => {
        it("does nothing if no rules match", () => {
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

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("ok");
        });

        it("applies the first matching rule, ignoring others", () => {
            const firstMatchingRuleMessage = "firstMatchingRuleMessage";

            /** @type {AdvancedConfiguration} */
            const config = {
                customStateRules: [
                    {
                        condition: mockFailingCondition,
                        resultingStatus: "ok",
                        resultingMessage: "Other message",
                    },
                    {
                        condition: mockPassingCondition,
                        resultingStatus: "warning",
                        resultingMessage: firstMatchingRuleMessage,
                    },
                    {
                        condition: mockPassingCondition,
                        resultingStatus: "error",
                        resultingMessage: "Other message",
                    },
                ],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("warning");
            expect(snapshot.message).toBe(firstMatchingRuleMessage);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("does not apply in case of task state errors", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                customStateRules: [
                    {
                        condition: mockPassingCondition,
                        resultingStatus: "warning",
                        resultingMessage: "Warning message",
                    },
                ],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            const errorMessage = "errorMessage";
            calculatedState.updateFromTasksError(baseTasksSummary, errorMessage, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("error");
            expect(snapshot.message).toBe(errorMessage);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        describe("message parameters functionality", () => {
            it("allows replacing parameters in the string with state properties", () => {
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

                const calculatedState = new CalculatedState(config, mockLogger, now);

                calculatedState.updateFromTasksSummary(baseTasksSummary, now);

                const snapshot = calculatedState.getSnapshot();
                expect(snapshot.message).toBe(`Hours value: ${snapshot.hours}`);
            });

            it("ignores whitespace around the parameter name", () => {
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

                const calculatedState = new CalculatedState(config, mockLogger, now);

                calculatedState.updateFromTasksSummary(baseTasksSummary, now);

                const snapshot = calculatedState.getSnapshot();
                expect(snapshot.message).toBe(`Hours value: ${snapshot.hours}`);
            });

            it("ignores unknown parameters", () => {
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

                const calculatedState = new CalculatedState(config, mockLogger, now);

                calculatedState.updateFromTasksSummary(baseTasksSummary, now);

                const snapshot = calculatedState.getSnapshot();
                expect(snapshot.message).toBe("Hours value: %{unknownParameter}");
            });
        });
    });

    describe("nagging and downtime conditions handling", () => {
        it("does nothing if no conditions match", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockFailingCondition],
                downtimeConditions: [mockFailingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies nagging conditions", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockPassingCondition, mockFailingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies blinking conditions", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                blinkingConditions: [mockPassingCondition, mockFailingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(true);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies downtime conditions", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                downtimeConditions: [mockFailingCondition, mockPassingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(true);
        });

        it("doesn't turn on nagging or blinking if downtime is enabled", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockPassingCondition],
                blinkingConditions: [mockPassingCondition],
                downtimeConditions: [mockPassingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(true);
        });

        it("doesn't turn on blinking if nagging is enabled", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockPassingCondition],
                blinkingConditions: [mockPassingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("also applies in case of task state errors", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockPassingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            const errorMessage = "errorMessage";
            calculatedState.updateFromTasksError(baseTasksSummary, errorMessage, now);

            const snapshot = calculatedState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("uses up-to-date status timer data", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                downtimeConditions: [mockFailingCondition],
            };

            const calculatedState = new CalculatedState(config, mockLogger, now);

            const errorMessage = "errorMessage";

            calculatedState.updateFromTasksError(
                baseTasksSummary,
                errorMessage,
                moment(now).add(1, "seconds")
            );

            expect(mockMatchFunction).toHaveBeenLastCalledWith(
                mockFailingCondition,
                expect.objectContaining({ secondsSinceOkStatus: 1 })
            );

            calculatedState.updateFromTasksSummary(baseTasksSummary, moment(now).add(2, "seconds"));

            expect(mockMatchFunction).toHaveBeenLastCalledWith(
                mockFailingCondition,
                expect.objectContaining({ secondsSinceOkStatus: 0 })
            );
        });
    });

    describe("status counters", () => {
        it("are updated based on status", () => {
            const config = {};
            const calculatedState = new CalculatedState(config, mockLogger, now);

            calculatedState.updateFromTasksSummary(baseTasksSummary, now);
            calculatedState.updateFromTasksSummary(baseTasksSummary, moment(now).add(1, "s"));

            let snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.secondsInCurrentStatus).toBe(1);
            expect(snapshot.secondsSinceOkStatus).toBe(0);

            const afterTwoSeconds = moment(now).add(2, "s");
            const afterThreeSeconds = moment(now).add(3, "s");
            const afterFourSeconds = moment(now).add(4, "s");

            calculatedState.updateFromTasksError(baseTasksSummary, "msg", afterTwoSeconds);
            calculatedState.updateFromTasksError(baseTasksSummary, "msg", afterThreeSeconds);
            calculatedState.updateFromTasksError(baseTasksSummary, "msg", afterFourSeconds);

            snapshot = calculatedState.getSnapshot();
            expect(snapshot.status).toBe("error");
            expect(snapshot.secondsInCurrentStatus).toBe(2);
            expect(snapshot.secondsSinceOkStatus).toBe(3);
        });
    });
});
