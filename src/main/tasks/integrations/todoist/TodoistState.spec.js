/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const moment = require("moment");

const TodoistState = require("./TodoistState");

/** @type {Pick<TodoistTask, "checked" | "due" | "is_deleted" | "parent_id">} */
const baseTaskData = {
    due: null,
    checked: false,
    is_deleted: false,
    parent_id: null,
};

const name = "name";
const task1 = "task1";
const task2 = "task2";

describe("TodoistState", () => {
    describe("tasks tracking", () => {
        it("correctly handles task completion", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            const initialTask = { ...baseTaskData, id: "1", content: name, labels: ["11"] };
            state.updateFromTasks([initialTask]);

            state.updateFromTasks([{ ...initialTask, checked: true }]);

            const tasks = state.getTasksForTodayOrWithLabel("11", now, {
                includeFutureTasksWithLabel: false,
            });

            expect(tasks).toHaveLength(0);
        });

        it("correctly handles task renames", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            const intialTask = { ...baseTaskData, id: "1", content: task1, labels: ["11"] };
            state.updateFromTasks([intialTask]);

            state.updateFromTasks([{ ...intialTask, content: task2 }]);

            const tasks = state.getTasksForTodayOrWithLabel("11", now, {
                includeFutureTasksWithLabel: false,
            });

            expect(tasks).toEqual([{ ...intialTask, content: task2 }]);
        });

        it("correctly handles due date changes", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            const initialTask = { ...baseTaskData, id: "1", content: name, labels: ["11"] };
            state.updateFromTasks([initialTask]);

            const sameTimeTomorrow = moment(now).add(1, "days");
            const dueTimeTomorrow = { date: sameTimeTomorrow.toISOString() };
            state.updateFromTasks([{ ...initialTask, due: dueTimeTomorrow }]);

            const tasksForTodayOrWithLabelNoFuture = state.getTasksForTodayOrWithLabel("11", now, {
                includeFutureTasksWithLabel: false,
            });

            const futureTasksWithLabel = state.getFutureTasksWithLabel("11", now);

            expect(tasksForTodayOrWithLabelNoFuture).toHaveLength(0);
            expect(futureTasksWithLabel).toHaveLength(1);
        });

        it("correctly handles deleted tasks", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            const initialTask = { ...baseTaskData, id: "1", content: name, labels: ["11"] };
            state.updateFromTasks([initialTask]);

            state.updateFromTasks([{ ...initialTask, is_deleted: true }]);

            const tasks = state.getTasksForTodayOrWithLabel("11", now, {
                includeFutureTasksWithLabel: false,
            });

            expect(tasks).toHaveLength(0);
        });

        describe("when tasks are scheduled for today or overdue", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            beforeAll(() => {
                const sameTimeYesterday = moment(now).subtract(1, "days");
                const dueTimeToday = { date: now.toISOString() };
                const dueDayToday = { date: now.format("YYYY-MM-DD") };
                const dueTimeYesterday = { date: sameTimeYesterday.toISOString() };
                const dueDayYesterday = { date: sameTimeYesterday.format("YYYY-MM-DD") };

                state.updateFromTasks([
                    { ...baseTaskData, id: "1", content: name, labels: ["11"], due: dueTimeToday },
                    { ...baseTaskData, id: "2", content: name, labels: ["22"], due: dueTimeToday },
                    { ...baseTaskData, id: "3", content: name, labels: ["11"], due: dueDayToday },
                    { ...baseTaskData, id: "4", content: name, labels: ["22"], due: dueDayToday },
                    {
                        ...baseTaskData,
                        id: "5",
                        content: name,
                        labels: ["11"],
                        due: dueTimeYesterday,
                    },
                    {
                        ...baseTaskData,
                        id: "6",
                        content: name,
                        labels: ["22"],
                        due: dueTimeYesterday,
                    },
                    {
                        ...baseTaskData,
                        id: "7",
                        content: name,
                        labels: ["11"],
                        due: dueDayYesterday,
                    },
                    {
                        ...baseTaskData,
                        id: "8",
                        content: name,
                        labels: ["22"],
                        due: dueDayYesterday,
                    },
                ]);
            });

            it("getTasksForTodayOrWithLabel return them all regardless of label", () => {
                const tasksNoFuture = state.getTasksForTodayOrWithLabel("11", now, {
                    includeFutureTasksWithLabel: false,
                });

                const tasksIncludingFuture = state.getTasksForTodayOrWithLabel("11", now, {
                    includeFutureTasksWithLabel: true,
                });

                expect(tasksNoFuture).toHaveLength(8);
                expect(tasksIncludingFuture).toHaveLength(8);
            });

            it("getFutureTasksWithLabel does not return any of them", () => {
                expect(state.getFutureTasksWithLabel("11", now)).toHaveLength(0);
            });
        });

        describe("when tasks don't have a due date", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            beforeAll(() => {
                state.updateFromTasks([
                    { ...baseTaskData, id: "1", content: name, labels: ["11"] },
                    { ...baseTaskData, id: "2", content: name, labels: ["22"] },
                ]);
            });

            it("getTasksForTodayOrWithLabel returns the ones with the label", () => {
                const tasksNoFuture = state.getTasksForTodayOrWithLabel("11", now, {
                    includeFutureTasksWithLabel: false,
                });

                const tasksIncludingFuture = state.getTasksForTodayOrWithLabel("11", now, {
                    includeFutureTasksWithLabel: true,
                });

                expect(tasksNoFuture).toHaveLength(1);
                expect(tasksIncludingFuture).toHaveLength(1);
            });

            it("getFutureTasksWithLabel does not return any of them", () => {
                expect(state.getFutureTasksWithLabel("11", now)).toHaveLength(0);
            });
        });

        describe("when tasks have a due date in the future", () => {
            const state = new TodoistState();
            const now = moment("2020-09-26 21:15:00");

            beforeAll(() => {
                const sameTimeTomorrow = moment(now).add(1, "days");
                const dueTimeTomorrow = { date: sameTimeTomorrow.toISOString() };
                const dueDayTomorrow = { date: sameTimeTomorrow.format("YYYY-MM-DD") };

                state.updateFromTasks([
                    {
                        ...baseTaskData,
                        id: "1",
                        content: name,
                        labels: ["11"],
                        due: dueTimeTomorrow,
                    },
                    {
                        ...baseTaskData,
                        id: "2",
                        content: name,
                        labels: ["22"],
                        due: dueTimeTomorrow,
                    },
                    {
                        ...baseTaskData,
                        id: "3",
                        content: name,
                        labels: ["11"],
                        due: dueDayTomorrow,
                    },
                    {
                        ...baseTaskData,
                        id: "4",
                        content: name,
                        labels: ["22"],
                        due: dueDayTomorrow,
                    },
                ]);
            });

            it("getTasksForTodayOrWithLabel does or does not return the ones with the label, depending on options", () => {
                const tasksNoFuture = state.getTasksForTodayOrWithLabel("11", now, {
                    includeFutureTasksWithLabel: false,
                });

                const tasksIncludingFuture = state.getTasksForTodayOrWithLabel("11", now, {
                    includeFutureTasksWithLabel: true,
                });

                expect(tasksNoFuture).toHaveLength(0);
                expect(tasksIncludingFuture).toHaveLength(2);
            });

            it("getFutureTasksWithLabel returns the ones with the label", () => {
                expect(state.getFutureTasksWithLabel("11", now)).toHaveLength(2);
            });
        });
    });
});
