const { app, dialog } = require("electron");

const Controller = require("./Controller");
const Logger = require("./Logger");

const logger = new Logger();
logger.enableLoggingUnhandledErrorsAndRejections();
logger.info("Starting application");

// prevent Electron from automatically showing errors as dialog boxes to the user
// motivation: in very rare cases, the app runs into a (harmless) error on close
// note that these kinds of errors are still being logged, see above
dialog.showErrorBox = () => {};

// this reduces visual artifacts when showing/hiding windows (like our custom dialogs) on Windows
app.disableHardwareAcceleration();

app.on("ready", () => {
    // this means Electron has finished initialization and we can use all APIs
    onAppReady(logger);
});

async function onAppReady(logger) {
    const controller = new Controller(logger);

    try {
        await controller.initialize();
    } catch (error) {
        dialog.showMessageBoxSync({ type: "error", message: error.message });
        app.exit();
    }
}
