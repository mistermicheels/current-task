const { BrowserWindow, app, shell } = require("electron");

const windowWebPreferences = require("./windowWebPreferences");

class AboutWindow {
    /** @param {BrowserWindow} parentWindow */
    constructor(parentWindow) {
        this._parentWindow = parentWindow;
        this._browserWindow = undefined;
    }

    async show() {
        if (this._browserWindow) {
            this._browserWindow.focus();
            return;
        }

        this._browserWindow = new BrowserWindow({
            width: 620,
            height: 300,
            parent: this._parentWindow,
            fullscreenable: false,
            maximizable: false,
            minimizable: false,
            resizable: false,
            webPreferences: windowWebPreferences,
            show: false,
        });

        this._browserWindow.removeMenu();

        // load from magic global variable defined by Electron Forge Webpack plugin
        // @ts-ignore
        await this._browserWindow.loadURL(ABOUT_WEBPACK_ENTRY);

        this._browserWindow.webContents.send("appVersion", app.getVersion());
        this._browserWindow.show();

        this._browserWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: "deny" };
        });

        this._browserWindow.on("close", () => {
            this._browserWindow = undefined;
        });
    }

    destroy() {
        if (this._browserWindow) {
            this._browserWindow.destroy();
        }
    }
}

module.exports = AboutWindow;
