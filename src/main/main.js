const { app, dialog } = require("electron");

const Logger = require("./Logger");
const Controller = require("./Controller");

// Squirrel might start the app while when installing/uninstalling.
let properAppStartup = !require("electron-squirrel-startup");

if (properAppStartup) {
    const logger = new Logger();
    logger.enableLoggingUnhandledErrorsAndRejections();
    logger.info("Starting application");

    app.on("ready", () => {
        // this means Electron has finished initialization and we can use all APIs
        onAppReady(logger);
    });
} else {
    app.quit();
}

async function onAppReady(logger) {
    const controller = new Controller(logger);

    try {
        await controller.initialize();
    } catch (error) {
        dialog.showMessageBoxSync({ type: "error", message: error.message });
        app.exit();
    }
}
