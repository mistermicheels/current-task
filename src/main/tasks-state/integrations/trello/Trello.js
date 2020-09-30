/** @typedef { import("../../../configuration/IntegrationConfiguration").TrelloIntegrationConfiguration } TrelloIntegrationConfiguration */
/** @typedef { import("../../../windows/DialogInput").DialogField } DialogField */
/** @typedef { import("../../../Logger") } Logger */
/** @typedef { import("../Integration").Integration<"trello"> } TrelloIntegration */

const TrelloApi = require("./TrelloApi");
const TrelloCardTransformer = require("./TrelloCardTransformer");

/** @implements {TrelloIntegration} */
class Trello {
    /** @param {Logger} logger */
    constructor(logger) {
        this._key = undefined;
        this._token = undefined;
        this._labelName = undefined;
        this._boards = undefined;

        this._api = new TrelloApi(logger);
        this._transformer = new TrelloCardTransformer();

        this._logger = logger;
    }

    /** @returns {DialogField[]} */
    getConfigurationDialogFields() {
        return [
            {
                type: "text",
                name: "key",
                label: "Trello API key",
                placeholder: "Your Trello API key",
                required: true,
                inputType: "password",
                currentValue: this._key,
            },
            {
                type: "text",
                name: "token",
                label: "Trello token",
                placeholder: "Your Trello token",
                required: true,
                inputType: "password",
                info:
                    "You can find your personal API key at https://trello.com/app-key. There, you can also manually generate a token (you will be asked to grant access to an imaginary application called 'Server Token'). Do not share your token with anyone.",
                currentValue: this._token,
            },
            {
                type: "text",
                name: "labelName",
                label: "Label name",
                placeholder: "Current task label",
                required: true,
                info:
                    "A label with this name will mark cards as current task. You can create a label with this name on each board you want to use.",
                currentValue: this._labelName,
            },
            {
                type: "textList",
                name: "boards",
                label: "Board names",
                listPlaceholder: "No boards specified",
                itemPlaceholder: "Board name",
                buttonText: "Add board",
                info:
                    "If you specify a list of boards here, the app will only look at those boards. Click a board to remove it again.",
                currentValue: this._boards,
            },
        ];
    }

    /** @param {TrelloIntegrationConfiguration} configuration*/
    configure(configuration) {
        this._key = configuration.key;
        this._token = configuration.token;
        this._labelName = configuration.labelName;
        this._boards = configuration.boards;
    }

    async getRelevantTasksForState() {
        this._logger.debugIntegration("Retrieving relevant cards from Trello");
        this._checkKeyTokenAndLabelNameSpecified();
        const relevantCards = await this._api.getCards(this._key, this._token, this._boards);
        return relevantCards.map((card) => this._transformer.transform(card, this._labelName));
    }

    async performCleanup() {
        // no cleanup needed for Trello integration
    }

    _checkKeyTokenAndLabelNameSpecified() {
        if (!this._key || !this._token || !this._labelName) {
            throw new Error("Trello not configured");
        }
    }
}

module.exports = Trello;
