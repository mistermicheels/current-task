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

function onAppReady() {
    const configuration = loadConfigurationFromStore();
    const todoist = new Todoist(configuration.todoistLabelId, configuration.todoistToken);
    const appWindow = new AppWindow();

    checkTasksState(todoist, appWindow);
    setInterval(() => checkTasksState(todoist, appWindow), 5 * 1000);
    setInterval(() => todoist.removeCurrentLabelFromFutureTasks(), 10 * 60 * 1000);
}

function loadConfigurationFromStore() {
    const store = new ElectronStore();
    const todoistLabelId = store.get("todoistLabelId");
    const todoistToken = store.get("todoistToken");

    if (!todoistLabelId) {
        store.set("todoistLabelId", 0);
    }

    if (!todoistToken) {
        store.set("todoistToken", "");
    }

    if (!todoistLabelId || !todoistToken) {
        const configurationFilePath = path.join(app.getPath("userData"), "config.json");

        dialog.showMessageBoxSync({
            type: "error",
            message: `Please update configuration data in ${configurationFilePath}`,
        });

        app.quit();
    }

    return { todoistLabelId, todoistToken };
}

/**
 * @param {Todoist} todoist
 * @param {AppWindow} appWindow
 */
async function checkTasksState(todoist, appWindow) {
    const tasksState = await todoist.getTasksState();
    appWindow.setTasksState(tasksState);
}
