/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../tasks-state/TasksState").TasksState } TasksState */

const moment = require("moment");

const Logger = require("../Logger");

const AppState = require("./AppState");
const ConditionMatcher = require("./ConditionMatcher");

jest.mock("../Logger");
jest.mock("./ConditionMatcher");

const mockPassingCondition = {};
const mockFailingCondition = {};

// @ts-ignore
ConditionMatcher.mockImplementation(() => {
    return {
        match: (condition, _state) => {
            return condition === mockPassingCondition;
        },
    };
});

const mockLogger = new Logger();

const now = moment("2020-09-19 14:05:10");

/** @type {TasksState} */
const baseTasksState = {
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

describe("AppState", () => {
    describe("the default behavior", () => {
        it("sets the message to the current task's title if there is exactly one", () => {
            const config = {};
            const appState = new AppState(config, mockLogger, now);

            const tasksState = {
                ...baseTasksState,
                numberMarkedCurrent: 1,
                currentTaskTitle: "Test",
            };

            appState.updateFromTasksState(tasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe(tasksState.currentTaskTitle);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("indicates if there is no current task", () => {
            const config = {};
            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe("(no current task)");
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("indicates if there are multiple tasks marked current", () => {
            const config = {};
            const appState = new AppState(config, mockLogger, now);

            const tasksState = {
                ...baseTasksState,
                numberMarkedCurrent: 3,
                currentTaskTitle: "",
            };

            appState.updateFromTasksState(tasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe("(3 tasks marked current)");
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("sets status to error for a tasks state error", () => {
            const config = {};
            const appState = new AppState(config, mockLogger, now);

            const errorMessage = "errorMessage";
            appState.updateFromTasksStateError(baseTasksState, errorMessage, now);

            const snapshot = appState.getSnapshot();
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

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
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

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
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

            const appState = new AppState(config, mockLogger, now);

            const errorMessage = "errorMessage";
            appState.updateFromTasksStateError(baseTasksState, errorMessage, now);

            const snapshot = appState.getSnapshot();
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

                const appState = new AppState(config, mockLogger, now);

                appState.updateFromTasksState(baseTasksState, now);

                const snapshot = appState.getSnapshot();
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

                const appState = new AppState(config, mockLogger, now);

                appState.updateFromTasksState(baseTasksState, now);

                const snapshot = appState.getSnapshot();
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

                const appState = new AppState(config, mockLogger, now);

                appState.updateFromTasksState(baseTasksState, now);

                const snapshot = appState.getSnapshot();
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

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies nagging conditions", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockPassingCondition, mockFailingCondition],
            };

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies blinking conditions", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                blinkingConditions: [mockPassingCondition, mockFailingCondition],
            };

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.blinkingEnabled).toBe(true);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies downtime conditions", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                downtimeConditions: [mockFailingCondition, mockPassingCondition],
            };

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
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

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
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

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("also applies in case of task state errors", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                naggingConditions: [mockPassingCondition],
            };

            const appState = new AppState(config, mockLogger, now);

            const errorMessage = "errorMessage";
            appState.updateFromTasksStateError(baseTasksState, errorMessage, now);

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.blinkingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });
    });

    describe("status counters", () => {
        it("are updated based on status", () => {
            const config = {};
            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);
            appState.updateFromTasksState(baseTasksState, moment(now).add(1, "s"));

            let snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.secondsInCurrentStatus).toBe(1);
            expect(snapshot.secondsSinceOkStatus).toBe(0);

            appState.updateFromTasksStateError(baseTasksState, "message", moment(now).add(2, "s"));
            appState.updateFromTasksStateError(baseTasksState, "message", moment(now).add(3, "s"));
            appState.updateFromTasksStateError(baseTasksState, "message", moment(now).add(4, "s"));

            snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("error");
            expect(snapshot.secondsInCurrentStatus).toBe(2);
            expect(snapshot.secondsSinceOkStatus).toBe(3);
        });

        it("are reset when coming out of downtime", () => {
            /** @type {AdvancedConfiguration} */
            const config = {
                downtimeConditions: [mockPassingCondition],
            };

            const appState = new AppState(config, mockLogger, now);

            appState.updateFromTasksState(baseTasksState, now);
            appState.updateFromTasksState(baseTasksState, moment(now).add(1, "s"));

            let snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.downtimeEnabled).toBe(true);
            expect(snapshot.secondsInCurrentStatus).toBe(1);

            /** @type {AdvancedConfiguration} */
            const updatedConfig = {
                downtimeConditions: [mockFailingCondition],
            };

            appState.updateConfiguration(updatedConfig);

            appState.updateFromTasksState(baseTasksState, moment(now).add(2, "s"));
            appState.updateFromTasksState(baseTasksState, moment(now).add(3, "s"));
            appState.updateFromTasksState(baseTasksState, moment(now).add(4, "s"));

            snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.downtimeEnabled).toBe(false);
            expect(snapshot.secondsInCurrentStatus).toBe(2);
        });
    });
});
