/** @typedef { import("../types/TaskData").TaskData } TaskData */

const moment = require("moment");

const TasksStateCalculator = require("./TasksStateCalculator");

const tasksStateCalculator = new TasksStateCalculator();

/** @type {TaskData[]} */
let relevantTasks;

describe("TasksStateCalculator", () => {
    describe("getTasksStateFromTasks", () => {
        it("handles a situation with no relevant tasks", () => {
            relevantTasks = [];

            const tasksState = tasksStateCalculator.getTasksStateFromTasks(relevantTasks, moment());

            expect(tasksState.numberOverdue).toBe(0);
            expect(tasksState.numberOverdueMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueNotMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueWithTime).toBe(0);
            expect(tasksState.numberOverdueWithTimeMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueWithTimeNotMarkedCurrent).toBe(0);
            expect(tasksState.numberScheduledForToday).toBe(0);
            expect(tasksState.numberScheduledForTodayMarkedCurrent).toBe(0);
            expect(tasksState.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksState.numberMarkedCurrent).toBe(0);
            expect(tasksState.currentTaskTitle).toBe("");
            expect(tasksState.currentTaskHasDate).toBe(false);
            expect(tasksState.currentTaskHasTime).toBe(false);
            expect(tasksState.currentTaskIsOverdue).toBe(false);
            expect(tasksState.currentTaskIsScheduledForToday).toBe(false);
        });

        it("sets the current task info if there is exactly one current task", () => {
            const taskTitle = "taskTitle";
            const now = moment("2020-08-15 18:15:00");

            relevantTasks = [
                {
                    title: taskTitle,
                    dueDate: "2020-08-14",
                    dueDatetime: undefined,
                    markedCurrent: true,
                },
            ];

            const tasksState = tasksStateCalculator.getTasksStateFromTasks(relevantTasks, now);

            expect(tasksState.numberOverdue).toBe(1);
            expect(tasksState.numberOverdueMarkedCurrent).toBe(1);
            expect(tasksState.numberOverdueNotMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueWithTime).toBe(0);
            expect(tasksState.numberOverdueWithTimeMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueWithTimeNotMarkedCurrent).toBe(0);
            expect(tasksState.numberScheduledForToday).toBe(0);
            expect(tasksState.numberScheduledForTodayMarkedCurrent).toBe(0);
            expect(tasksState.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksState.numberMarkedCurrent).toBe(1);
            expect(tasksState.currentTaskTitle).toBe(taskTitle);
            expect(tasksState.currentTaskHasDate).toBe(true);
            expect(tasksState.currentTaskHasTime).toBe(false);
            expect(tasksState.currentTaskIsOverdue).toBe(true);
            expect(tasksState.currentTaskIsScheduledForToday).toBe(false);
        });

        it("doesn't set current task info if there is more than task marked current", () => {
            const now = moment("2020-08-15 18:15:00");

            relevantTasks = [
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

            const tasksState = tasksStateCalculator.getTasksStateFromTasks(relevantTasks, now);

            expect(tasksState.numberOverdue).toBe(2);
            expect(tasksState.numberOverdueMarkedCurrent).toBe(2);
            expect(tasksState.numberOverdueNotMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueWithTime).toBe(0);
            expect(tasksState.numberOverdueWithTimeMarkedCurrent).toBe(0);
            expect(tasksState.numberOverdueWithTimeNotMarkedCurrent).toBe(0);
            expect(tasksState.numberScheduledForToday).toBe(0);
            expect(tasksState.numberScheduledForTodayMarkedCurrent).toBe(0);
            expect(tasksState.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksState.numberMarkedCurrent).toBe(2);
            expect(tasksState.currentTaskTitle).toBe("");
            expect(tasksState.currentTaskHasDate).toBe(false);
            expect(tasksState.currentTaskHasTime).toBe(false);
            expect(tasksState.currentTaskIsOverdue).toBe(false);
            expect(tasksState.currentTaskIsScheduledForToday).toBe(false);
        });

        it("correctly calculates overdue tasks, overdue tasks with time and tasks scheduled for today", () => {
            const now = moment("2020-08-15 18:15:00");

            relevantTasks = [
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

            const tasksState = tasksStateCalculator.getTasksStateFromTasks(relevantTasks, now);

            expect(tasksState.numberOverdue).toBe(3);
            expect(tasksState.numberOverdueMarkedCurrent).toBe(1);
            expect(tasksState.numberOverdueNotMarkedCurrent).toBe(2);
            expect(tasksState.numberOverdueWithTime).toBe(2);
            expect(tasksState.numberOverdueWithTimeMarkedCurrent).toBe(1);
            expect(tasksState.numberOverdueWithTimeNotMarkedCurrent).toBe(1);
            expect(tasksState.numberScheduledForToday).toBe(2);
            expect(tasksState.numberScheduledForTodayMarkedCurrent).toBe(2);
            expect(tasksState.numberScheduledForTodayNotMarkedCurrent).toBe(0);
            expect(tasksState.numberMarkedCurrent).toBe(3);
            expect(tasksState.currentTaskTitle).toBe("");
            expect(tasksState.currentTaskHasDate).toBe(false);
            expect(tasksState.currentTaskHasTime).toBe(false);
            expect(tasksState.currentTaskIsOverdue).toBe(false);
            expect(tasksState.currentTaskIsScheduledForToday).toBe(false);
        });

        it("correctly handles a task that puts all current task flags to true", () => {
            const now = moment("2020-08-15 18:15:00");

            relevantTasks = [
                {
                    title: "Test2",
                    dueDate: "2020-08-15",
                    dueDatetime: moment(now).subtract(1, "minutes"),
                    markedCurrent: true,
                },
            ];

            const tasksState = tasksStateCalculator.getTasksStateFromTasks(relevantTasks, now);

            expect(tasksState.currentTaskHasDate).toBe(true);
            expect(tasksState.currentTaskHasTime).toBe(true);
            expect(tasksState.currentTaskIsOverdue).toBe(true);
            expect(tasksState.currentTaskIsScheduledForToday).toBe(true);
        });
    });
});
