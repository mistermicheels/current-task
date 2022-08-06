/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const TodoistTaskMerger = require("./TodoistTaskMerger");

const merger = new TodoistTaskMerger();

/** @type {Pick<TodoistTask, "checked" | "due" | "is_deleted" | "parent_id">} */
const baseTaskData = {
    due: null,
    checked: false,
    is_deleted: false,
    parent_id: null,
};

const placeholderTitle1 = "placeholderTitle1";
const placeholderTitle2 = "placeholderTitle2";
const placeholderTitle3 = "placeholderTitle3";
const currentTaskLabelName = "currentTaskLabelName";

describe("TodoistTaskMerger", () => {
    it("merges subtasks marked current with parent task marked current", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual([
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
        ]);
    });

    it("preserves specific due date information set on subtasks when merging", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
                due: {
                    recurring: true,
                    string: "Every day 12:30",
                    date: "2020-09-05",
                    datetime: "2020-09-05T10:30:00Z",
                    timezone: "Europe/Brussels",
                },
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual([tasksFromApi[1]]);
    });

    it("supports multiple levels of merging", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
            },
            {
                ...baseTaskData,
                id: "3",
                parent_id: "2",
                content: placeholderTitle3,
                labels: [currentTaskLabelName],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual([
            {
                ...baseTaskData,
                id: "3",
                parent_id: "2",
                content: placeholderTitle3,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
        ]);
    });

    it("does not merge if parent doesn't have label", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge if no children have label", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge if level in between does not have label", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [],
                due: {
                    recurring: true,
                    string: "Every day 12:30",
                    date: "2020-09-05",
                    datetime: "2020-09-05T10:30:00Z",
                    timezone: "Europe/Brussels",
                },
            },
            {
                ...baseTaskData,
                id: "3",
                parent_id: "2",
                content: placeholderTitle3,
                labels: [currentTaskLabelName],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge if level in between is missing", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "3",
                parent_id: "2",
                content: placeholderTitle3,
                labels: [currentTaskLabelName],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge parent data into subtasks not marked current", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
            },
            {
                ...baseTaskData,
                id: "3",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual([
            {
                ...baseTaskData,
                id: "2",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                ...baseTaskData,
                id: "3",
                parent_id: "1",
                content: placeholderTitle2,
                labels: [],
            },
        ]);
    });

    it("handles situation without any top-level tasks", () => {
        const tasksFromApi = [
            {
                ...baseTaskData,
                id: "1",
                parent_id: "999",
                content: placeholderTitle1,
                labels: [currentTaskLabelName],
            },
            {
                ...baseTaskData,
                id: "2",
                parent_id: "999",
                content: placeholderTitle2,
                labels: [currentTaskLabelName],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("handles situation without any tasks at all", () => {
        const tasksFromApi = [];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelName
        );

        expect(merged).toEqual(tasksFromApi);
    });
});
