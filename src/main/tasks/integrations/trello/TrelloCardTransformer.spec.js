/** @typedef { import("./TrelloCard").TrelloCard } TrelloCard */

const moment = require("moment");

const TrelloCardTransformer = require("./TrelloCardTransformer");

const transformer = new TrelloCardTransformer();

const placeholderId = "placeholderId";
const placeholderTitle = "placeholderTitle";
const currentTaskLabelId = "currentTaskLabelId";
const currentTaskLabelName = "currentTaskLabelName";
const otherLabelId = "otherLabelId";
const otherLabelName = "otherLabelName";

describe("TrelloCardTransformer", () => {
    it("handles cards without due date", () => {
        /** @type {TrelloCard} */
        const cardFromApi = {
            id: placeholderId,
            name: placeholderTitle,
            due: null,
            labels: [],
        };

        const transformed = transformer.transform(cardFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });

    it("handles cards with due date", () => {
        /** @type {TrelloCard} */
        const cardFromApi = {
            id: placeholderId,
            name: placeholderTitle,
            due: "2020-09-27T10:11:00.000Z",
            labels: [],
        };

        const transformed = transformer.transform(cardFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: "2020-09-27",
            dueDatetime: moment("2020-09-27T10:11:00.000Z"),
            markedCurrent: false,
        });
    });

    it("marks the card as current if it has the relevant label", () => {
        /** @type {TrelloCard} */
        const cardFromApi = {
            id: placeholderId,
            name: placeholderTitle,
            due: null,
            labels: [{ id: currentTaskLabelId, name: currentTaskLabelName }],
        };

        const transformed = transformer.transform(cardFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: true,
        });
    });

    it("ignores labels other than the relevant label", () => {
        /** @type {TrelloCard} */
        const cardFromApi = {
            id: placeholderId,
            name: placeholderTitle,
            due: null,
            labels: [{ id: otherLabelId, name: otherLabelName }],
        };

        const transformed = transformer.transform(cardFromApi, currentTaskLabelName);

        expect(transformed).toEqual({
            title: placeholderTitle,
            dueDate: undefined,
            dueDatetime: undefined,
            markedCurrent: false,
        });
    });
});
