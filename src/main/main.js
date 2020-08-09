const { app, dialog } = require("electron");

const Controller = require("./Controller");

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
    const controller = new Controller();

    try {
        await controller.initialize();
    } catch (error) {
        dialog.showMessageBoxSync({ type: "error", message: error.message });
        app.exit();
    }
}
