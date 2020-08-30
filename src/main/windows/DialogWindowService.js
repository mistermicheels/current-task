/** @typedef { import("../../types/DialogInput").DialogInput } DialogInput */

const { BrowserWindow, ipcMain } = require("electron");

const windowWebPreferences = require("./windowWebPreferences");

const DIALOG_WINDOW_WIDTH = 400;
const DIALOG_WINDOW_PLACEHOLDER_HEIGHT = 100;

class DialogWindowService {
    /** @param {BrowserWindow} parentWindow */
    constructor(parentWindow) {
        this._parentWindow = parentWindow;
        this._openDialogWindow = undefined;
    }

    /**
     * @param {DialogInput} input
     */
    async openDialogAndGetResult(input) {
        if (this._openDialogWindow) {
            this._openDialogWindow.focus();
            return undefined;
        }

        this._openDialogWindow = new BrowserWindow({
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

        this._openDialogWindow.removeMenu();

        // load from magic global variable defined by Electron Forge Webpack plugin
        // @ts-ignore
        await this._openDialogWindow.loadURL(DIALOG_WEBPACK_ENTRY);

        this._openDialogWindow.webContents.send("dialogInput", input);

        ipcMain.once("dialogHeight", (_event, data) => {
            this._openDialogWindow.setContentSize(DIALOG_WINDOW_WIDTH, data.height);
            this._openDialogWindow.center();
            this._openDialogWindow.show();
        });

        return new Promise((resolve) => {
            const dialogResultHandler = (_event, data) => {
                resolve(data.result);
                this._openDialogWindow.close();
            };

            ipcMain.once("dialogResult", dialogResultHandler);

            this._openDialogWindow.once("closed", () => {
                resolve(undefined);
                this._openDialogWindow = undefined;
                ipcMain.removeListener("dialogResult", dialogResultHandler);
            });
        });
    }
}

module.exports = DialogWindowService;
