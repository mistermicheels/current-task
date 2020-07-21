const { app, dialog } = require("electron");
const ElectronStore = require("electron-store");
const path = require("path");

const Todoist = require("./Todoist");
const AppWindow = require("./AppWindow");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
    // eslint-disable-line global-require
    app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", onAppReady);

async function onAppReady() {
    const configuration = await loadConfigurationFromStore();
    const todoist = new Todoist(configuration.todoistLabelName, configuration.todoistToken);

    try {
        await todoist.initialize();
    } catch (error) {
        await quitWithError(error.message);
    }

    const appWindow = new AppWindow();

    checkTasksState(todoist, appWindow);
    setInterval(() => checkTasksState(todoist, appWindow), 5 * 1000);
    setInterval(() => removeLabelFromTasksOnFutureDate(todoist), 10 * 60 * 1000);
}

async function loadConfigurationFromStore() {
    const store = new ElectronStore();
    const todoistLabelName = store.get("todoistLabelName");
    const todoistToken = store.get("todoistToken");

    if (!todoistLabelName) {
        store.set("todoistLabelName", "Label_name_placeholder");
    }

    if (!todoistToken) {
        store.set("todoistToken", "Token_placeholder");
    }

    if (!todoistLabelName || !todoistToken) {
        const configurationFilePath = path.join(app.getPath("userData"), "config.json");
        await quitWithError(`Please update configuration data in ${configurationFilePath}`);
    }

    return { todoistLabelName, todoistToken };
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
 * @param {AppWindow} appWindow
 */
async function checkTasksState(todoist, appWindow) {
    let tasksState;

    try {
        tasksState = await todoist.getTasksState(); 
    } catch (error) {
        tasksState = { state: "error", message: error.message };   
    }
    
    appWindow.setTasksState(tasksState);
}

/**
 * @param {Todoist} todoist
 */
async function removeLabelFromTasksOnFutureDate(todoist) {
    try {
        await todoist.removeLabelFromTasksOnFutureDate();
    } catch (error) {
        // this is just a cleanup task, we don't care too much if it fails
        console.log("Failed to remove label from tasks on future date")
    }
}
