const { app, dialog } = require("electron");
const ElectronStore = require("electron-store");
const path = require("path");

const Todoist = require("./Todoist");
const AppState = require("./AppState");
const AppWindow = require("./AppWindow");
const ConditionMatcher = require("./ConditionMatcher");

// Squirrel might start the app while when installing/uninstalling.
let properAppStartup = !require("electron-squirrel-startup");

if (!properAppStartup) {
    app.quit();
}

// this means Electron has finished initialization and we can use all APIs
app.on("ready", () => {
    if (properAppStartup) {
        onAppReady();
    }
});

async function onAppReady() {
    const configuration = await loadConfigurationFromStore();
    const todoist = new Todoist(configuration.todoistLabelName, configuration.todoistToken);

    try {
        await todoist.initialize();
    } catch (error) {
        await quitWithError(error.message);
    }

    const appState = new AppState();
    const appWindow = new AppWindow();
    const conditionMatcher = new ConditionMatcher();
    const customErrors = configuration.customErrors;
    const naggingConditions = configuration.naggingConditions;
    const downtimeConditions = configuration.downtimeConditions;

    await updateTasksState(todoist, appState, appWindow, conditionMatcher, customErrors);
    updateWindow(appState, appWindow, conditionMatcher, naggingConditions, downtimeConditions);

    setInterval(async () => {
        await updateTasksState(todoist, appState, appWindow, conditionMatcher, customErrors);
        updateWindow(appState, appWindow, conditionMatcher, naggingConditions, downtimeConditions);
    }, 10 * 1000);

    setInterval(() => removeLabelFromTasksOnFutureDate(todoist), 10 * 60 * 1000);

    setInterval(async () => {
        updateWindow(appState, appWindow, conditionMatcher, naggingConditions, downtimeConditions);
    }, 1000);
}

async function loadConfigurationFromStore() {
    let store;
    const configurationFilePath = path.join(app.getPath("userData"), "config.json");

    try {
        store = new ElectronStore({ clearInvalidConfig: false });
    } catch (error) {
        await quitWithError(`Please put valid JSON data in ${configurationFilePath}`);
    }

    const todoistToken = store.get("todoistToken_DO_NOT_SHARE_THIS");
    const todoistLabelName = store.get("todoistLabelName");

    if (!todoistToken) {
        store.set("todoistToken_DO_NOT_SHARE_THIS", "Token_placeholder");
    }

    if (!todoistLabelName) {
        store.set("todoistLabelName", "Label_name_placeholder");
    }

    if (!todoistToken || !todoistLabelName) {
        const configurationFilePath = path.join(app.getPath("userData"), "config.json");
        await quitWithError(`Please update configuration data in ${configurationFilePath}`);
    }

    const customErrors = store.get("customErrors");
    const naggingConditions = store.get("naggingConditions");
    const downtimeConditions = store.get("downtimeConditions");

    return { todoistLabelName, todoistToken, customErrors, naggingConditions, downtimeConditions };
}

function quitWithError(message) {
    dialog.showMessageBoxSync({ type: "error", message });
    app.quit();

    // if we don't wait, the rest of the code keeps executing after this
    return new Promise((resolve) => {
        app.on("quit", resolve);
    });
}

/**
 * @param {Todoist} todoist
 * @param {AppState} appState
 * @param {AppWindow} appWindow
 * @param {ConditionMatcher} conditionMatcher
 * @param {any} customErrors
 */
async function updateTasksState(todoist, appState, appWindow, conditionMatcher, customErrors) {
    let tasksState;

    try {
        tasksState = await todoist.getTasksState();
    } catch (error) {
        tasksState = { status: "error", message: error.message };
    }

    if (!tasksState.error && customErrors) {
        for (const customError of customErrors) {
            if (conditionMatcher.match(customError.condition, appState.getSnapshot(tasksState))) {
                tasksState = { status: "error", message: customError.message };
            }
        }
    }

    appState.updateWithTasksState(tasksState);
    appWindow.setTasksState(tasksState);
}

/**
 * @param {AppState} appState
 * @param {AppWindow} appWindow
 * @param {ConditionMatcher} conditionMatcher
 * @param {any} naggingConditions
 * @param {any} downtimeConditions
 */
function updateWindow(
    appState,
    appWindow,
    conditionMatcher,
    naggingConditions,
    downtimeConditions
) {
    const state = appState.getSnapshot();

    let shouldNag = false;

    if (naggingConditions) {
        shouldNag = naggingConditions.some((condition) => conditionMatcher.match(condition, state));
    }

    appWindow.setNaggingMode(shouldNag);

    let shouldHide = false;

    if (downtimeConditions) {
        shouldHide = downtimeConditions.some((condition) =>
            conditionMatcher.match(condition, state)
        );
    }

    appWindow.setHiddenMode(shouldHide);
}

/**
 * @param {Todoist} todoist
 */
async function removeLabelFromTasksOnFutureDate(todoist) {
    try {
        await todoist.removeLabelFromTasksOnFutureDate();
    } catch (error) {
        // this is just a cleanup task, we don't care too much if it fails
        console.log("Failed to remove label from tasks on future date");
    }
}
