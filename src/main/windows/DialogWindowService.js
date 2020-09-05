/** @typedef { import("../../types/DialogInput").DialogInput } DialogInput */

const { BrowserWindow, ipcMain } = require("electron");

const windowWebPreferences = require("./windowWebPreferences");

const DIALOG_WINDOW_WIDTH = 400;
const DIALOG_WINDOW_PLACEHOLDER_HEIGHT = 100;

class DialogWindowService {
    /** @param {BrowserWindow} parentWindow */
    constructor(parentWindow) {
        this._parentWindow = parentWindow;
        this._browserWindow = undefined;
        this._windowInitializationPromise = this._initializeBrowserWindow();

        this._hasOpenDialog = false;
    }

    async _initializeBrowserWindow() {
        this._browserWindow = new BrowserWindow({
            width: DIALOG_WINDOW_WIDTH,
            height: DIALOG_WINDOW_PLACEHOLDER_HEIGHT, // will be overwritten before dialog is shown
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
        await this._browserWindow.loadURL(DIALOG_WEBPACK_ENTRY);
    }

    /**
     * @param {DialogInput} input
     */
    async openDialogAndGetResult(input) {
        await this._windowInitializationPromise;

        if (this._hasOpenDialog) {
            this._browserWindow.focus();
            return undefined;
        }

        this._hasOpenDialog = true;
        this._browserWindow.webContents.send("dialogInput", input);

        ipcMain.once("dialogHeight", (_event, data) => {
            this._browserWindow.setContentSize(DIALOG_WINDOW_WIDTH, data.height);
            this._browserWindow.center();
            this._browserWindow.show();
        });

        return new Promise((resolve) => {
            const dialogResultHandler = (_event, data) => {
                resolve(data.result);
                this._hasOpenDialog = false;
                this._browserWindow.hide();
                this._browserWindow.removeListener("close", closeHandler);
            };

            const closeHandler = (event) => {
                resolve(undefined);
                event.preventDefault();
                this._hasOpenDialog = false;
                this._browserWindow.hide();
                ipcMain.removeListener("dialogResult", dialogResultHandler);
            };

            ipcMain.once("dialogResult", dialogResultHandler);
            this._browserWindow.once("close", closeHandler);
        });
    }
}

module.exports = DialogWindowService;
