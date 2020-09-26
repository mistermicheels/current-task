/** @typedef { import("../../../Logger") } Logger */
/** @typedef { import("./TodoistLabel").TodoistLabel } TodoistLabel */
/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

const axios = require("axios").default;
const moment = require("moment");
const querystring = require("querystring");
const uuid = require("uuid");

// found no documentation on this so far, 8 hours seems to be pretty safe
const SYNC_TOKEN_EXPIRY_HOURS = 8;

class TodoistApi {
    /** @param {Logger} logger */
    constructor(logger) {
        this._logger = logger;

        /** @type {string} */
        this._syncTokenForNextCall = undefined;

        /** @type {moment.Moment} */
        this._lastSyncTokenUpdateTimestamp = undefined;

        this._latestSyncCallPromise = undefined;
    }

    /**
     * @param {string} token
     * @returns {Promise<{ changedTasks: TodoistTask[], changedLabels: TodoistLabel[], wasFullSync: boolean }>}
     */
    async getTaskAndLabelChanges(token) {
        this._clearSyncTokenIfExpired();
        const syncTokenForCall = this._syncTokenForNextCall;

        const callDescription = syncTokenForCall
            ? "Todoist incremental task and labels sync"
            : "Todoist full tasks and labels sync";

        const data = {
            resource_types: `["items", "labels"]`,
            sync_token: syncTokenForCall || "*",
            token,
        };

        const responseDataPromise = this._performApiRequest(data, callDescription);
        this._latestSyncCallPromise = responseDataPromise;
        const responseData = await responseDataPromise;

        if (this._latestSyncCallPromise === responseDataPromise) {
            this._updateSyncToken(responseData.sync_token);
            const changedTasks = responseData.items;
            const changedLabels = responseData.labels;
            return { changedTasks, changedLabels, wasFullSync: !syncTokenForCall };
        } else {
            return { changedTasks: [], changedLabels: [], wasFullSync: false };
        }
    }

    _clearSyncTokenIfExpired() {
        if (!this._lastSyncTokenUpdateTimestamp) {
            return;
        }

        const now = moment();

        const startOfExpiry = moment(this._lastSyncTokenUpdateTimestamp).add(
            SYNC_TOKEN_EXPIRY_HOURS,
            "hours"
        );

        if (now.isAfter(startOfExpiry)) {
            this._syncTokenForNextCall = undefined;
            this._lastSyncTokenUpdateTimestamp = undefined;
        }
    }

    /** @param {string} newSyncToken */
    _updateSyncToken(newSyncToken) {
        if (this._syncTokenForNextCall !== newSyncToken) {
            this._syncTokenForNextCall = newSyncToken;
            this._lastSyncTokenUpdateTimestamp = moment();
        }
    }

    /**
     * @param {TodoistTask[]} tasks
     * @param {number} labelId
     * @param {string} token
     */
    async removeLabelFromTasks(tasks, labelId, token) {
        const commands = tasks.map((task) => ({
            type: "item_update",
            uuid: uuid.v1(),
            args: {
                id: task.id,
                labels: task.labels.filter((taskLabelId) => taskLabelId !== labelId),
            },
        }));

        const data = {
            commands: JSON.stringify(commands),
            token,
        };

        const numberTasks = tasks.length;
        const callDescription = `Todoist remove label from ${numberTasks} tasks`;
        await this._performApiRequest(data, callDescription);
    }

    async _performApiRequest(data, callDescription) {
        this._logger.debug(`${callDescription} call start`);

        try {
            const response = await axios({
                method: "post",
                url: `https://api.todoist.com/sync/v8/sync`,
                data: querystring.stringify(data),
                timeout: 60 * 1000, // one minute timeout to prevent calls from hanging eternally for whatever reason
            });

            this._logger.debug(`${callDescription} call successful`);
            return response.data;
        } catch (error) {
            this._handleApiRequestError(error, callDescription);
        }
    }

    _handleApiRequestError(error, callDescription) {
        if (error.response && error.response.status === 403) {
            this._logger.debug(`${callDescription} call auth error, status code 403`);
            throw new Error("Invalid Todoist token");
        } else {
            if (error.response) {
                this._logger.debug(
                    `${callDescription} general error, status code ${error.response.status}`
                );
            } else {
                this._logger.debug(`${callDescription} call general error, no response received`);
            }

            throw new Error("Problem reaching Todoist");
        }
    }
}

module.exports = TodoistApi;
