const { app, dialog } = require("electron");

const Logger = require("./Logger");
const Controller = require("./Controller");

const logger = new Logger();
logger.enableLoggingUnhandledErrorsAndRejections();
logger.info("Starting application");

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
