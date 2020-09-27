/** @typedef { import("../TaskData").TaskData } TaskData */
/** @typedef { import("./TrelloCard").TrelloCard } TrelloCard */

const moment = require("moment");

const DateTimeHelper = require("../../../util/DateTimeHelper");

class TrelloCardTransformer {
    constructor() {
        this._dateTimeHelper = new DateTimeHelper();
    }

    /**
     * @param {TrelloCard} cardFromApi
     * @param {string} currentTaskLabelName
     * @returns {TaskData}
     */
    transform(cardFromApi, currentTaskLabelName) {
        let dueDate = undefined;
        let dueDatetime = undefined;

        if (cardFromApi.due) {
            dueDate = this._dateTimeHelper.getDateString(cardFromApi.due);
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
