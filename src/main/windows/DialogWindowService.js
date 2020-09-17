/** @typedef { import("../../types/DialogInput").DialogInput } DialogInput */

const { BrowserWindow, ipcMain, screen } = require("electron");

const windowWebPreferences = require("./windowWebPreferences");

const DIALOG_WINDOW_WIDTH = 400;
const DIALOG_WINDOW_PLACEHOLDER_HEIGHT = 100;

class DialogWindowService {
    /** @param {BrowserWindow} parentWindow */
    constructor(parentWindow) {
        this._parentWindow = parentWindow;
        this._browserWindow = undefined;
        this._browserWindowFrameHeight = undefined;

        // we create a browser window and reuse that for all dialogs
        // on some systems, creating a new BrowserWindow is way too slow for smooth interaction
        this._windowInitializationPromise = this._initializeBrowserWindow();

        this._hasOpenDialog = false;
    }

    async _initializeBrowserWindow() {
        this._browserWindow = new BrowserWindow({
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

        // note: setting content size directly on window creation (with useContentSize) seems to behave differently
        this._browserWindow.setContentSize(DIALOG_WINDOW_WIDTH, DIALOG_WINDOW_PLACEHOLDER_HEIGHT);

        const totalHeight = this._browserWindow.getBounds().height;
        this._browserWindowFrameHeight = totalHeight - DIALOG_WINDOW_PLACEHOLDER_HEIGHT;
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
            const requestedHeight = data.height;
            const targetHeight = this._getTargetHeight(requestedHeight);
            this._browserWindow.setContentSize(DIALOG_WINDOW_WIDTH, targetHeight);
            this._browserWindow.center();
            this._browserWindow.show();
            this._browserWindow.webContents.send("dialogShown", undefined);
        });

        return new Promise((resolve) => {
            const dialogResultHandler = (_event, data) => {
                resolve(data.result);
                this._browserWindow.removeListener("close", closeHandler);
                this._hideDialog();
            };

            const closeHandler = (event) => {
                resolve(undefined);
                event.preventDefault();
                ipcMain.removeListener("dialogResult", dialogResultHandler);
                this._hideDialog();
            };

            ipcMain.once("dialogResult", dialogResultHandler);
            this._browserWindow.once("close", closeHandler);
        });
    }

    _getTargetHeight(requestedHeight) {
        const workAreaHeight = screen.getPrimaryDisplay().workArea.height;
        const maxContentHeight = workAreaHeight - this._browserWindowFrameHeight;
        return Math.min(requestedHeight, maxContentHeight);
    }

    _hideDialog() {
        // before hiding the dialog, make sure that its contents are hidden
        // otherwise, the next opened dialog will briefly show the contents of the old one
        // see also https://github.com/electron/electron/issues/8410

        this._browserWindow.webContents.send("hideDialogContents", undefined);

        ipcMain.once("dialogContentsHidden", () => {
            this._hasOpenDialog = false;
            this._browserWindow.hide();
        });
    }

    focusOpenDialog() {
        if (this._hasOpenDialog) {
            this._browserWindow.focus();
        }
    }

    destroy() {
        this._browserWindow.destroy();
    }
}

module.exports = DialogWindowService;
