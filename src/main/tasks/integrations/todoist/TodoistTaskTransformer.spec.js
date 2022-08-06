/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const moment = require("moment");

const TodoistTaskTransformer = require("./TodoistTaskTransformer");

const transformer = new TodoistTaskTransformer();

/** @type {Pick<TodoistTask, "checked" | "due" | "id" | "is_deleted" | "parent_id">} */
const baseTaskData = {
    id: "1",
    due: null,
    checked: false,
    is_deleted: false,
    parent_id: null,
};

const placeholderTitle = "placeholderTitle";
const currentTaskLabelName = "currentTaskLabelNam";
const otherLabelName = "otherLabelName";

describe("TodoistTaskTransformer", () => {
    it("handles tasks without due date", () => {
        const taskFromApi = {
            ...baseTaskData,
            content: placeholderTitle,
            labels: [],
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });

    it("handles tasks with due date but no due time", () => {
        const taskFromApi = {
            ...baseTaskData,
            content: placeholderTitle,
            labels: [],
            due: {
                date: "2020-09-04",
            },
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: "2020-09-04",
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });

    it("handles tasks with due date and due time as local time", () => {
        const taskFromApi = {
            ...baseTaskData,
            content: placeholderTitle,
            labels: [],
            due: {
                date: "2020-09-05T12:30:00",
            },
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: "2020-09-05",
            dueDatetime: moment("2020-09-05T12:30:00"),
            markedCurrent: false,
        });
    });

    it("handles tasks with due date and due time with timezone", () => {
        const taskFromApi = {
            ...baseTaskData,
            content: placeholderTitle,
            labels: [],
            due: {
                date: "2020-09-05T10:30:00Z",
            },
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: "2020-09-05",
            dueDatetime: moment("2020-09-05T10:30:00Z"),
            markedCurrent: false,
        });
    });

    it("marks the task as current if it has the relevant label", () => {
        const taskFromApi = {
            ...baseTaskData,
            content: placeholderTitle,
            labels: [currentTaskLabelName],
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: true,
        });
    });

    it("ignores labels other than the relevant label", () => {
        const taskFromApi = {
            ...baseTaskData,
            content: placeholderTitle,
            labels: [otherLabelName],
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });
});
