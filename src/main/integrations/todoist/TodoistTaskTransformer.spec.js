const moment = require("moment");

const TodoistTaskTransformer = require("./TodoistTaskTransformer");

const transformer = new TodoistTaskTransformer();

const placeholderTitle = "placeholderTitle";
const currentTaskLabelId = 123;
const otherLabelId = 234;

describe("TodoistTaskTransformer", () => {
    it("handles tasks without due date", () => {
        const taskFromApi = {
            content: placeholderTitle,
            label_ids: [],
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelId);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });

    it("handles tasks with due date but no due time", () => {
        const taskFromApi = {
            content: placeholderTitle,
            label_ids: [],
            due: {
                recurring: false,
                string: "2020-09-04",
                date: "2020-09-04",
            },
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelId);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: "2020-09-04",
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });

    it("handles tasks with due date and due time", () => {
        const taskFromApi = {
            content: placeholderTitle,
            label_ids: [],
            due: {
                recurring: true,
                string: "Every day 12:30",
                date: "2020-09-05",
                datetime: "2020-09-05T10:30:00Z",
                timezone: "Europe/Brussels",
            },
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelId);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: "2020-09-05",
            dueDatetime: moment("2020-09-05T10:30:00Z"),
            markedCurrent: false,
        });
    });

    it("marks the task as current if it has the relevant label", () => {
        const taskFromApi = {
            content: placeholderTitle,
            label_ids: [currentTaskLabelId],
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelId);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: true,
        });
    });

    it("ignores labels other than the relevant label", () => {
        const taskFromApi = {
            content: placeholderTitle,
            label_ids: [otherLabelId],
        };

        const transformed = transformer.transform(taskFromApi, currentTaskLabelId);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });
});
