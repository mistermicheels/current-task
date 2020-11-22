/** @typedef { import("../../../Logger") } Logger */
/** @typedef { import("./TrelloCard").TrelloCard } TrelloCard */

const axios = require("axios").default;

// limit the number of boards we retrieve cards from. one reason for doing this are the Trello API rate limits.
const MAX_BOARDS = 15;

class TrelloApi {
    /** @param {Logger} logger */
    constructor(logger) {
        this._logger = logger;
    }

    /**
     * @param {string} key
     * @param {string} token
     * @param {string[]} [selectedBoardNames]
     * @returns {Promise<TrelloCard[]>}
     */
    async getCards(key, token, selectedBoardNames) {
        const authParams = { key, token };

        const boardsData = await this._performApiRequest(
            "GET",
            "/members/me/boards",
            { ...authParams, fields: "name,closed" },
            "Trello get boards"
        );

        const relevantBoards = this._getRelevantBoards(boardsData, selectedBoardNames);

        const cardsArrays = await Promise.all(
            relevantBoards.map((board) =>
                this._performApiRequest(
                    "GET",
                    `/boards/${board.id}/cards`,
                    { ...authParams, fields: "name,labels,due" },
                    `Trello get cards for board ${board.name}`
                )
            )
        );

        return cardsArrays.flat();
    }

    /**
     * @param {{ id: string, name: string, closed: boolean }[]} boardsFromApi
     * @param {string[]} [selectedBoardNames]
     */
    _getRelevantBoards(boardsFromApi, selectedBoardNames) {
        let boards = boardsFromApi.filter((board) => !board.closed);

        if (selectedBoardNames && selectedBoardNames.length > 0) {
            const selectedBoards = [];

            for (const boardName of selectedBoardNames) {
                const matchingBoard = boards.find((board) => board.name === boardName);

                if (matchingBoard) {
                    selectedBoards.push(matchingBoard);
                } else {
                    throw new Error(`No board '${boardName}'`);
                }
            }

            boards = selectedBoards;
        }

        if (boards.length > MAX_BOARDS) {
            throw new Error(`More than ${MAX_BOARDS} boards to check`);
        }

        return boards;
    }

    /**
     * @param {TrelloCard} card
     * @param {string} labelName
     * @param {string} key
     * @param {string} token
     */
    async removeLabelFromCard(card, labelName, key, token) {
        const matchingLabel = card.labels.find((label) => label.name === labelName);

        await this._performApiRequest(
            "DELETE",
            `/cards/${card.id}/idLabels/${matchingLabel.id}`,
            { key, token },
            "Trello remove label from card"
        );
    }

    async _performApiRequest(method, relativeUrl, params, callDescription) {
        this._logger.debugIntegration(`${callDescription} call start`);

        try {
            const response = await axios({
                method,
                url: `https://api.trello.com/1${relativeUrl}`,
                params,
                timeout: 60 * 1000, // one minute timeout to prevent calls from hanging eternally for whatever reason
            });

            this._logger.debugIntegration(`${callDescription} call successful`);
            return response.data;
        } catch (error) {
            this._handleApiRequestError(error, callDescription);
        }
    }

    _handleApiRequestError(error, callDescription) {
        if (error.response && error.response.status === 401) {
            this._logger.debugIntegration(`${callDescription} call auth error, status code 401`);
            throw new Error("Invalid Trello API key or token");
        } else {
            if (error.response) {
                this._logger.debugIntegration(
                    `${callDescription} general error, status code ${error.response.status}`
                );
            } else {
                this._logger.debugIntegration(
                    `${callDescription} call general error, no response received`
                );
            }

            throw new Error("Problem reaching Trello");
        }
    }
}

module.exports = TrelloApi;
