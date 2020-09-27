/** @typedef { import("../TaskData").TaskData } TaskData */
/** @typedef { import("./TrelloCard").TrelloCard } TrelloCard */

const moment = require("moment");

// YYYY-MM-DD
const DATE_STRING_LENGTH = 10;

class TrelloCardTransformer {
    /**
     * @param {TrelloCard} cardFromApi
     * @param {string} currentTaskLabelName
     * @returns {TaskData}
     */
    transform(cardFromApi, currentTaskLabelName) {
        let dueDate = undefined;
        let dueDatetime = undefined;

        if (cardFromApi.due) {
            dueDate = cardFromApi.due.substring(0, DATE_STRING_LENGTH);
            dueDatetime = moment(cardFromApi.due);
        }

        return {
            title: cardFromApi.name,
            dueDate,
            dueDatetime,
            markedCurrent: cardFromApi.labels.some((label) => label.name === currentTaskLabelName),
        };
    }
}

module.exports = TrelloCardTransformer;
