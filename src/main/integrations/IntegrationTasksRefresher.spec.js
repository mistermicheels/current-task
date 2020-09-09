/** @typedef { import("../../types/Integration").Integration} Integration */
/** @typedef { import("../../types/IntegrationTasksListener").IntegrationTasksListener} IntegrationTasksListener */

const {
    IntegrationTasksRefresher,
    MAX_NUMBER_SKIPPED_REFRESHES,
} = require("./IntegrationTasksRefresher");

const Logger = require("../Logger");

jest.mock("../Logger");

/** @type {IntegrationTasksListener & { onTasksRefreshed: jest.Mock}} */
const mockListener = { onTasksRefreshed: jest.fn() };

/** @type {Integration & { getRelevantTasksForState: jest.Mock }} */
// @ts-ignore
const mockIntegrationClassInstance = { getRelevantTasksForState: jest.fn() };

let logs = [];

function getAndClearLogs() {
    const result = logs;
    logs = [];
    return result;
}

// @ts-ignore
Logger.mockImplementation(() => {
    return {
        debug: (message) => logs.push(message),
        warn: (message) => logs.push(message),
        error: (message) => logs.push(message),
    };
});

const mockLogger = new Logger();

function waitUntilPromisesHandled() {
    // setImmediate only triggers after all currently completed promises are handled
    return new Promise((resolve) => setImmediate(resolve));
}

function getResolvablePromise() {
    /** @type {(any) => void} */
    let resolve;
    /** @type {(any) => void} */
    let reject;

    const promise = new Promise((providedResolve, providedReject) => {
        resolve = providedResolve;
        reject = providedReject;
    });

    return { promise, resolve, reject };
}

const tasks1 = [{ title: "1", dueDate: undefined, dueDatetime: undefined, markedCurrent: false }];
const tasks2 = [{ title: "2", dueDate: undefined, dueDatetime: undefined, markedCurrent: false }];
const errorMessage1 = "errorMessage1";
const errorMessage2 = "errorMessage2";

describe("IntegrationTasksRefresher", () => {
    /** @type {IntegrationTasksRefresher} */
    let refresher;

    beforeEach(() => {
        mockListener.onTasksRefreshed.mockReset();
        mockIntegrationClassInstance.getRelevantTasksForState.mockReset();
        getAndClearLogs();
        refresher = new IntegrationTasksRefresher(mockListener, mockLogger);
    });

    async function triggerRefreshAndWait() {
        refresher.triggerRefresh(mockIntegrationClassInstance);
        await waitUntilPromisesHandled();
    }

    it("handles successful refresh completed before next trigger", async () => {
        for (const tasksList of [tasks1, tasks2]) {
            mockIntegrationClassInstance.getRelevantTasksForState.mockResolvedValue(tasksList);
            await triggerRefreshAndWait();

            expect(mockListener.onTasksRefreshed).toHaveBeenCalledWith(
                tasksList,
                undefined,
                mockIntegrationClassInstance
            );

            mockListener.onTasksRefreshed.mockReset();

            expect(getAndClearLogs()).toEqual([
                "Refreshing tasks from integration",
                "Successfully refreshed tasks from integration",
            ]);
        }
    });

    it("handles error returned before next trigger", async () => {
        for (const errorMessage of [errorMessage1, errorMessage2]) {
            const error = new Error(errorMessage);
            mockIntegrationClassInstance.getRelevantTasksForState.mockRejectedValue(error);
            await triggerRefreshAndWait();

            expect(mockListener.onTasksRefreshed).toHaveBeenCalledWith(
                undefined,
                errorMessage,
                mockIntegrationClassInstance
            );

            mockListener.onTasksRefreshed.mockReset();

            expect(getAndClearLogs()).toEqual([
                "Refreshing tasks from integration",
                `Error refreshing tasks from integration: ${errorMessage}`,
            ]);
        }
    });

    it("skips a refresh if previous call hasn't completed yet", async () => {
        // first trigger

        const firstCallResolvablePromise = getResolvablePromise();
        const firstCallResult = firstCallResolvablePromise.promise;
        mockIntegrationClassInstance.getRelevantTasksForState.mockReturnValue(firstCallResult);
        await triggerRefreshAndWait();

        expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();
        expect(getAndClearLogs()).toEqual(["Refreshing tasks from integration"]);

        // new trigger before first integration call completes

        await triggerRefreshAndWait();

        expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();

        expect(getAndClearLogs()).toEqual([
            "Skipping refresh from integration, older one still in progress",
        ]);

        // first integration call completes

        firstCallResolvablePromise.resolve(tasks1);
        await waitUntilPromisesHandled();

        expect(mockListener.onTasksRefreshed).toHaveBeenCalledWith(
            tasks1,
            undefined,
            mockIntegrationClassInstance
        );

        expect(getAndClearLogs()).toEqual(["Successfully refreshed tasks from integration"]);
    });

    it.each([["result"], ["error"]])(
        "tries again and ignores %s from first call if maximum number of skips exceeded",
        async (firstCallResultType) => {
            // first trigger

            const firstCallResolvablePromise = getResolvablePromise();
            const firstCallResult = firstCallResolvablePromise.promise;
            mockIntegrationClassInstance.getRelevantTasksForState.mockReturnValue(firstCallResult);
            await triggerRefreshAndWait();

            expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();
            expect(getAndClearLogs()).toEqual(["Refreshing tasks from integration"]);

            // new triggers before first integration call completes, until max number of skips is reached

            for (let i = 0; i < MAX_NUMBER_SKIPPED_REFRESHES; i++) {
                await triggerRefreshAndWait();
            }

            expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();

            expect(getAndClearLogs()).toEqual(
                Array(MAX_NUMBER_SKIPPED_REFRESHES).fill(
                    "Skipping refresh from integration, older one still in progress"
                )
            );

            // new trigger after max number of skips is reached

            const secondCallResolvablePromise = getResolvablePromise();
            const secondCallResult = secondCallResolvablePromise.promise;
            mockIntegrationClassInstance.getRelevantTasksForState.mockReturnValue(secondCallResult);
            await triggerRefreshAndWait();

            expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();

            expect(getAndClearLogs()).toEqual([
                "Integration refresh call took longer than allowed, trying again",
                "Refreshing tasks from integration",
            ]);

            // first integration call completes

            if (firstCallResultType === "result") {
                firstCallResolvablePromise.resolve(tasks1);
            } else {
                firstCallResolvablePromise.reject(new Error(errorMessage1));
            }

            await waitUntilPromisesHandled();

            expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();

            expect(getAndClearLogs()).toEqual([
                `Ignoring ${firstCallResultType} from old integration refresh call`,
            ]);

            // second integration call completes

            secondCallResolvablePromise.resolve(tasks2);
            await waitUntilPromisesHandled();

            expect(mockListener.onTasksRefreshed).toHaveBeenCalledWith(
                tasks2,
                undefined,
                mockIntegrationClassInstance
            );

            mockListener.onTasksRefreshed.mockReset();

            expect(getAndClearLogs()).toEqual(["Successfully refreshed tasks from integration"]);
        }
    );

    it("resets skipped calls count when trying again after max number skips reached", async () => {
        const firstCallResolvablePromise = getResolvablePromise();
        const firstCallResult = firstCallResolvablePromise.promise;
        mockIntegrationClassInstance.getRelevantTasksForState.mockReturnValue(firstCallResult);
        await triggerRefreshAndWait();

        for (let i = 0; i < MAX_NUMBER_SKIPPED_REFRESHES; i++) {
            await triggerRefreshAndWait();
        }

        await triggerRefreshAndWait();
        await triggerRefreshAndWait();

        expect(mockListener.onTasksRefreshed).not.toHaveBeenCalled();

        expect(getAndClearLogs()).toEqual([
            "Refreshing tasks from integration",
            ...Array(MAX_NUMBER_SKIPPED_REFRESHES).fill(
                "Skipping refresh from integration, older one still in progress"
            ),
            "Integration refresh call took longer than allowed, trying again",
            "Refreshing tasks from integration",
            "Skipping refresh from integration, older one still in progress",
        ]);
    });
});
