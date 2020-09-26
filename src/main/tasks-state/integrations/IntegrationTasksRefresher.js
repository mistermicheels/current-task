/** @typedef { import("../../Logger") } Logger */
/** @typedef { import("./Integration").Integration<any> } Integration */
/** @typedef { import("./IntegrationTasksListener").IntegrationTasksListener } IntegrationTasksListener */

const MAX_NUMBER_SKIPPED_REFRESHES = 4;

class IntegrationTasksRefresher {
    /**
     * @param {IntegrationTasksListener} listener
     * @param {Logger} logger
     */
    constructor(listener, logger) {
        this._listener = listener;
        this._logger = logger;

        this._integrationRefreshInProgress = false;
        this._skippedIntegrationRefreshes = 0;
        this._latestIntegrationTasksPromise = undefined;
    }

    /** @param {Integration} integrationClassInstance */
    triggerRefresh(integrationClassInstance) {
        if (this._integrationRefreshInProgress) {
            if (this._skippedIntegrationRefreshes < MAX_NUMBER_SKIPPED_REFRESHES) {
                this._logger.warn("Skipping refresh from integration, older one still in progress");
                this._skippedIntegrationRefreshes++;
                return;
            } else {
                this._logger.warn(
                    "Integration refresh call took longer than allowed, trying again"
                );
            }
        }

        this._refreshFromIntegration(integrationClassInstance);
    }

    /** @param {Integration} integrationClassInstance */
    async _refreshFromIntegration(integrationClassInstance) {
        this._logger.debugIntegration("Refreshing tasks from integration");
        this._integrationRefreshInProgress = true;
        this._skippedIntegrationRefreshes = 0;

        const tasksPromise = integrationClassInstance.getRelevantTasksForState();
        this._latestIntegrationTasksPromise = tasksPromise;

        try {
            const tasks = await tasksPromise;

            if (this._latestIntegrationTasksPromise === tasksPromise) {
                this._listener.onTasksRefreshed(tasks, undefined, integrationClassInstance);
                this._logger.debugIntegration("Successfully refreshed tasks from integration");
                this._integrationRefreshInProgress = false;
            } else {
                this._logger.warn("Ignoring result from old integration refresh call");
            }
        } catch (error) {
            if (this._latestIntegrationTasksPromise === tasksPromise) {
                this._listener.onTasksRefreshed(undefined, error.message, integrationClassInstance);
                this._logger.error(`Error refreshing tasks from integration: ${error.message}`);
                this._integrationRefreshInProgress = false;
            } else {
                this._logger.warn("Ignoring error from old integration refresh call");
            }
        }
    }
}

module.exports = { IntegrationTasksRefresher, MAX_NUMBER_SKIPPED_REFRESHES };
