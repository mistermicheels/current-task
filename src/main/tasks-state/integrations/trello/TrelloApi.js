/** @typedef { import("../../../Logger") } Logger */
/** @typedef { import("./TrelloCard").TrelloCard } TrelloCard */

const axios = require("axios").default;

class TrelloApi {
    /** @param {Logger} logger */
    constructor(logger) {
        this._logger = logger;
    }

    /**
     * @param {string} key
     * @param {string} token
     * @returns {Promise<TrelloCard[]>}
     */
    async getCards(key, token) {
        const authParams = { key, token };

        const boardsData = await this._performApiRequest(
            "/members/me/boards",
            { ...authParams, fields: "name,closed" },
            "Trello get boards"
        );

        const openBoards = boardsData.filter((board) => !board.closed);

        const cardsArrays = await Promise.all(
            openBoards.map((board) =>
                this._performApiRequest(
                    `/boards/${board.id}/cards`,
                    { ...authParams, fields: "name,labels,due" },
                    `Trello get cards for board ${board.name}`
                )
            )
        );

        return cardsArrays.flat();
    }

    async _performApiRequest(relativeUrl, params, callDescription) {
        this._logger.debugIntegration(`${callDescription} call start`);

        try {
            const response = await axios({
                method: "get",
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
