/** @typedef { import("../types/TasksState").TasksState } TasksState */

const moment = require("moment");

const ConditionMatcher = require("./ConditionMatcher");
const AppState = require("./AppState");

jest.mock("./ConditionMatcher");

const mockPassingCondition = {};
const mockFailingCondition = {};

/** @type {TasksState} */
const baseTasksState = {
    numberOverdueWithTime: 0,
    numberOverdueWithTimeMarkedCurrent: 0,
    numberOverdueWithTimeNotMarkedCurrent: 0,
    numberMarkedCurrent: 0,
    currentTaskTitle: "",
    currentTaskHasDate: false,
    currentTaskHasTime: false,
    currentTaskIsOverdue: false,
};

describe("AppState", () => {
    let mockConditionMatcher;

    beforeAll(() => {
        // @ts-ignore
        ConditionMatcher.mockImplementation(() => {
            return {
                match: (condition, _state) => {
                    return condition === mockPassingCondition;
                },
            };
        });

        mockConditionMatcher = new ConditionMatcher();
    });

    describe("the default behavior", () => {
        it("sets the message to the current task's title if there is exactly one", () => {
            const appState = new AppState(mockConditionMatcher, {});

            const tasksState = {
                ...baseTasksState,
                numberMarkedCurrent: 1,
                currentTaskTitle: "Test",
            };

            appState.updateFromTasksState(tasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe(tasksState.currentTaskTitle);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("indicates if there is no current task", () => {
            const appState = new AppState(mockConditionMatcher, {});

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe("(no current task)");
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("indicates if there are multiple tasks marked current", () => {
            const appState = new AppState(mockConditionMatcher, {});

            const tasksState = {
                ...baseTasksState,
                numberMarkedCurrent: 3,
                currentTaskTitle: "",
            };

            appState.updateFromTasksState(tasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
            expect(snapshot.message).toBe("(3 tasks marked current)");
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("sets status to error for a tasks state error", () => {
            const appState = new AppState(mockConditionMatcher, {});

            const errorMessage = "errorMessage";
            appState.updateFromTasksStateError(baseTasksState, errorMessage, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("error");
            expect(snapshot.message).toBe(errorMessage);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });
    });

    describe("custom state rules handling", () => {
        it("does nothing if no rules match", () => {
            const appState = new AppState(mockConditionMatcher, {
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
            });

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("ok");
        });

        it("applies the first matching rule, ignoring others", () => {
            const firstMatchingRuleMessage = "firstMatchingRuleMessage";

            const appState = new AppState(mockConditionMatcher, {
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
            });

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("warning");
            expect(snapshot.message).toBe(firstMatchingRuleMessage);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("does not apply in case of task state errors", () => {
            const appState = new AppState(mockConditionMatcher, {
                customStateRules: [
                    {
                        condition: mockPassingCondition,
                        resultingStatus: "warning",
                        resultingMessage: "Warning message",
                    },
                ],
            });

            const errorMessage = "errorMessage";
            appState.updateFromTasksStateError(baseTasksState, errorMessage, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.status).toBe("error");
            expect(snapshot.message).toBe(errorMessage);
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        describe("message parameters functionality", () => {
            it("allows replacing parameters in the string with state properties", () => {
                const appState = new AppState(mockConditionMatcher, {
                    customStateRules: [
                        {
                            condition: mockPassingCondition,
                            resultingStatus: "ok",
                            resultingMessage: "Hours value: %{hours}",
                        },
                    ],
                });

                appState.updateFromTasksState(baseTasksState, moment());

                const snapshot = appState.getSnapshot();
                expect(snapshot.message).toBe(`Hours value: ${snapshot.hours}`);
            });

            it("ignores whitespace around the parameter name", () => {
                const appState = new AppState(mockConditionMatcher, {
                    customStateRules: [
                        {
                            condition: mockPassingCondition,
                            resultingStatus: "ok",
                            resultingMessage: "Hours value: %{    \thours }",
                        },
                    ],
                });

                appState.updateFromTasksState(baseTasksState, moment());

                const snapshot = appState.getSnapshot();
                expect(snapshot.message).toBe(`Hours value: ${snapshot.hours}`);
            });

            it("ignores unknown parameters", () => {
                const appState = new AppState(mockConditionMatcher, {
                    customStateRules: [
                        {
                            condition: mockPassingCondition,
                            resultingStatus: "ok",
                            resultingMessage: "Hours value: %{unknownParameter}",
                        },
                    ],
                });

                appState.updateFromTasksState(baseTasksState, moment());

                const snapshot = appState.getSnapshot();
                expect(snapshot.message).toBe("Hours value: %{unknownParameter}");
            });
        });
    });

    describe("nagging and downtime conditions handling", () => {
        it("does nothing if no conditions match", () => {
            const appState = new AppState(mockConditionMatcher, {
                naggingConditions: [mockFailingCondition],
                downtimeConditions: [mockFailingCondition],
            });

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies nagging conditions", () => {
            const appState = new AppState(mockConditionMatcher, {
                naggingConditions: [mockPassingCondition, mockFailingCondition],
            });

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.downtimeEnabled).toBe(false);
        });

        it("applies downtime conditions", () => {
            const appState = new AppState(mockConditionMatcher, {
                downtimeConditions: [mockFailingCondition, mockPassingCondition],
            });

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(true);
        });

        it("doesn't turn on nagging if downtime is enabled", () => {
            const appState = new AppState(mockConditionMatcher, {
                naggingConditions: [mockPassingCondition],
                downtimeConditions: [mockPassingCondition],
            });

            appState.updateFromTasksState(baseTasksState, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(false);
            expect(snapshot.downtimeEnabled).toBe(true);
        });

        it("also applies in case of task state errors", () => {
            const appState = new AppState(mockConditionMatcher, {
                naggingConditions: [mockPassingCondition],
            });

            const errorMessage = "errorMessage";
            appState.updateFromTasksStateError(baseTasksState, errorMessage, moment());

            const snapshot = appState.getSnapshot();
            expect(snapshot.naggingEnabled).toBe(true);
            expect(snapshot.downtimeEnabled).toBe(false);
        });
    });
});
