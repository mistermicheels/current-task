const { BrowserWindow, shell } = require("electron");
const path = require("path");

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
        const aboutFilePath = path.join(__dirname, "../../renderer/about/about.html");
        await this._browserWindow.loadFile(aboutFilePath);
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
