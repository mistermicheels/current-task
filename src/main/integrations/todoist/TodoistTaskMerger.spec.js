const TodoistTaskMerger = require("./TodoistTaskMerger");

const merger = new TodoistTaskMerger();

const placeholderTitle1 = "placeholderTitle1";
const placeholderTitle2 = "placeholderTitle2";
const placeholderTitle3 = "placeholderTitle3";
const currentTaskLabelId = 123;

describe("TodoistTaskMerger", () => {
    it("merges subtasks marked current with parent task marked current", () => {
        const tasksFromApi = [
            {
                id: 1,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [currentTaskLabelId],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual([
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [currentTaskLabelId],
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
                id: 1,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [currentTaskLabelId],
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
            currentTaskLabelId
        );

        expect(merged).toEqual([tasksFromApi[1]]);
    });

    it("supports multiple levels of merging", () => {
        const tasksFromApi = [
            {
                id: 1,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [currentTaskLabelId],
            },
            {
                id: 3,
                parent_id: 2,
                content: placeholderTitle3,
                label_ids: [currentTaskLabelId],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual([
            {
                id: 3,
                parent_id: 2,
                content: placeholderTitle3,
                label_ids: [currentTaskLabelId],
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
                id: 1,
                content: placeholderTitle1,
                label_ids: [],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [currentTaskLabelId],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge if no children have label", () => {
        const tasksFromApi = [
            {
                id: 1,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge if level in between does not have label", () => {
        const tasksFromApi = [
            {
                id: 1,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 2,
                parent_id: 1,
                content: placeholderTitle2,
                label_ids: [],
                due: {
                    recurring: true,
                    string: "Every day 12:30",
                    date: "2020-09-05",
                    datetime: "2020-09-05T10:30:00Z",
                    timezone: "Europe/Brussels",
                },
            },
            {
                id: 3,
                parent_id: 2,
                content: placeholderTitle3,
                label_ids: [currentTaskLabelId],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("does not merge if level in between is missing", () => {
        const tasksFromApi = [
            {
                id: 1,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
                due: {
                    recurring: false,
                    string: "2020-09-04",
                    date: "2020-09-04",
                },
            },
            {
                id: 3,
                parent_id: 2,
                content: placeholderTitle3,
                label_ids: [currentTaskLabelId],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual(tasksFromApi);
    });

    it("handles situation without any top-level tasks", () => {
        const tasksFromApi = [
            {
                id: 1,
                parent_id: 999,
                content: placeholderTitle1,
                label_ids: [currentTaskLabelId],
            },
            {
                id: 2,
                parent_id: 999,
                content: placeholderTitle2,
                label_ids: [currentTaskLabelId],
            },
        ];

        const merged = merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
            tasksFromApi,
            currentTaskLabelId
        );

        expect(merged).toEqual(tasksFromApi);
    });
});
