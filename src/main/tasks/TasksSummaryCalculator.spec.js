/** @typedef { import("./integrations/IntegrationTask").IntegrationTask } IntegrationTask */

const moment = require("moment");

const TasksSummaryCalculator = require("./TasksSummaryCalculator");

const tasksSummaryCalculator = new TasksSummaryCalculator();

/** @type {IntegrationTask[]} */
let tasks;

describe("TasksSummaryCalculator", () => {
    describe("getTasksSummaryFromTasks", () => {
        it("handles a situation with no relevant tasks", () => {
            tasks = [];

            const tasksSummary = tasksSummaryCalculator.getTasksSummaryFromTasks(tasks, moment());

            expect(tasksSummary.numberOverdue).toBe(0);
            expect(tasksSummary.numberOverdueMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueWithTime).toBe(0);
            expect(tasksSummary.numberOverdueWithTimeMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueWithTimeNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberScheduledForToday).toBe(0);
            expect(tasksSummary.numberScheduledForTodayMarkedCurrent).toBe(0);
            expect(tasksSummary.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberMarkedCurrent).toBe(0);
            expect(tasksSummary.currentTaskTitle).toBe("");
            expect(tasksSummary.currentTaskHasDate).toBe(false);
            expect(tasksSummary.currentTaskHasTime).toBe(false);
            expect(tasksSummary.currentTaskIsOverdue).toBe(false);
            expect(tasksSummary.currentTaskIsScheduledForToday).toBe(false);
        });

        it("sets the current task info if there is exactly one current task", () => {
            const taskTitle = "taskTitle";
            const now = moment("2020-08-15 18:15:00");

            tasks = [
                {
                    title: taskTitle,
                    dueDate: "2020-08-14",
                    dueDatetime: undefined,
                    markedCurrent: true,
                },
            ];

            const tasksSummary = tasksSummaryCalculator.getTasksSummaryFromTasks(tasks, now);

            expect(tasksSummary.numberOverdue).toBe(1);
            expect(tasksSummary.numberOverdueMarkedCurrent).toBe(1);
            expect(tasksSummary.numberOverdueNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueWithTime).toBe(0);
            expect(tasksSummary.numberOverdueWithTimeMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueWithTimeNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberScheduledForToday).toBe(0);
            expect(tasksSummary.numberScheduledForTodayMarkedCurrent).toBe(0);
            expect(tasksSummary.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberMarkedCurrent).toBe(1);
            expect(tasksSummary.currentTaskTitle).toBe(taskTitle);
            expect(tasksSummary.currentTaskHasDate).toBe(true);
            expect(tasksSummary.currentTaskHasTime).toBe(false);
            expect(tasksSummary.currentTaskIsOverdue).toBe(true);
            expect(tasksSummary.currentTaskIsScheduledForToday).toBe(false);
        });

        it("doesn't set current task info if there is more than task marked current", () => {
            const now = moment("2020-08-15 18:15:00");

            tasks = [
                {
                    title: "Test1",
                    dueDate: "2020-08-14",
                    dueDatetime: undefined,
                    markedCurrent: true,
                },
                {
                    title: "Test2",
                    dueDate: "2020-08-14",
                    dueDatetime: undefined,
                    markedCurrent: true,
                },
            ];

            const tasksSummary = tasksSummaryCalculator.getTasksSummaryFromTasks(tasks, now);

            expect(tasksSummary.numberOverdue).toBe(2);
            expect(tasksSummary.numberOverdueMarkedCurrent).toBe(2);
            expect(tasksSummary.numberOverdueNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueWithTime).toBe(0);
            expect(tasksSummary.numberOverdueWithTimeMarkedCurrent).toBe(0);
            expect(tasksSummary.numberOverdueWithTimeNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberScheduledForToday).toBe(0);
            expect(tasksSummary.numberScheduledForTodayMarkedCurrent).toBe(0);
            expect(tasksSummary.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberMarkedCurrent).toBe(2);
            expect(tasksSummary.currentTaskTitle).toBe("");
            expect(tasksSummary.currentTaskHasDate).toBe(false);
            expect(tasksSummary.currentTaskHasTime).toBe(false);
            expect(tasksSummary.currentTaskIsOverdue).toBe(false);
            expect(tasksSummary.currentTaskIsScheduledForToday).toBe(false);
        });

        it("correctly calculates overdue tasks, overdue tasks with time and tasks scheduled for today", () => {
            const now = moment("2020-08-15 18:15:00");

            tasks = [
                {
                    title: "Test1",
                    dueDate: undefined,
                    dueDatetime: undefined,
                    markedCurrent: true,
                },
                {
                    title: "Test2",
                    dueDate: "2020-08-15",
                    dueDatetime: moment(now).subtract(1, "minutes"),
                    markedCurrent: true,
                },
                {
                    title: "Test3",
                    dueDate: "2020-08-15",
                    dueDatetime: moment(now).add(1, "minutes"),
                    markedCurrent: true,
                },
                {
                    title: "Test4",
                    dueDate: "2020-08-14",
                    dueDatetime: moment(now).subtract(1, "days"),
                    markedCurrent: false,
                },
                {
                    title: "Test5",
                    dueDate: "2020-08-14",
                    dueDatetime: undefined,
                    markedCurrent: false,
                },
            ];

            const tasksSummary = tasksSummaryCalculator.getTasksSummaryFromTasks(tasks, now);

            expect(tasksSummary.numberOverdue).toBe(3);
            expect(tasksSummary.numberOverdueMarkedCurrent).toBe(1);
            expect(tasksSummary.numberOverdueNotMarkedCurrent).toBe(2);
            expect(tasksSummary.numberOverdueWithTime).toBe(2);
            expect(tasksSummary.numberOverdueWithTimeMarkedCurrent).toBe(1);
            expect(tasksSummary.numberOverdueWithTimeNotMarkedCurrent).toBe(1);
            expect(tasksSummary.numberScheduledForToday).toBe(2);
            expect(tasksSummary.numberScheduledForTodayMarkedCurrent).toBe(2);
            expect(tasksSummary.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksSummary.numberMarkedCurrent).toBe(3);
            expect(tasksSummary.currentTaskTitle).toBe("");
            expect(tasksSummary.currentTaskHasDate).toBe(false);
            expect(tasksSummary.currentTaskHasTime).toBe(false);
            expect(tasksSummary.currentTaskIsOverdue).toBe(false);
            expect(tasksSummary.currentTaskIsScheduledForToday).toBe(false);
        });

        it("correctly handles a task that puts all current task flags to true", () => {
            const now = moment("2020-08-15 18:15:00");

            tasks = [
                {
                    title: "Test2",
                    dueDate: "2020-08-15",
                    dueDatetime: moment(now).subtract(1, "minutes"),
                    markedCurrent: true,
                },
            ];

            const tasksSummary = tasksSummaryCalculator.getTasksSummaryFromTasks(tasks, now);

            expect(tasksSummary.currentTaskHasDate).toBe(true);
            expect(tasksSummary.currentTaskHasTime).toBe(true);
            expect(tasksSummary.currentTaskIsOverdue).toBe(true);
            expect(tasksSummary.currentTaskIsScheduledForToday).toBe(true);
        });
    });
});
