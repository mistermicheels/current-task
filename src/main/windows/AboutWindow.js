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
            width: 780,
            height: 320,
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

        this._browserWindow.webContents.on("new-window", (event, url) => {
            event.preventDefault();
            shell.openExternal(url);
        });

        this._browserWindow.on("closed", () => {
            this._browserWindow = undefined;
        });
    }
}

module.exports = AboutWindow;
