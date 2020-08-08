//@ts-check

/** @typedef { import("./types/InputDialogField").InputDialogField } InputDialogField */
/** @typedef { import("./types/Status").Status } Status */

const { dialog, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

const ENSURE_ON_TOP_INTERVAL = 1000;

const WEB_PREFERENCES_FOR_WINDOW = {
    // https://stackoverflow.com/a/59888788
    nodeIntegration: false, // is default value after Electron v5
    contextIsolation: true, // protect against prototype pollution
    enableRemoteModule: false, // turn off remote
    preload: path.join(__dirname, "preload.js"), // use a preload script
};

const DIALOG_WINDOW_WIDTH = 400;

class AppWindow {
    constructor() {
        this._initializeWindowPlacements();
        this._initializeWindow();

        this._naggingModeEnabled = false;
        this._hiddenModeEnabled = false;
        this._movingResizingEnabled = false;

        this._trayMenuOpened = false;

        this._hasOpenInputDialog = false;

        setInterval(() => {
            // when hovering the mouse over the taskbar, the window can get hidden behind the taskbar
            const shouldEnsureOnTop =
                !this._trayMenuOpened && !this._hiddenModeEnabled && !this._isFullyWithinWorkArea();

            if (shouldEnsureOnTop) {
                this._browserWindow.moveTop();
            }
        }, ENSURE_ON_TOP_INTERVAL);
    }

    _initializeWindowPlacements() {
        const screenWidth = screen.getPrimaryDisplay().bounds.width;
        const screenHeight = screen.getPrimaryDisplay().bounds.height;

        const workAreaHeight = screen.getPrimaryDisplay().workArea.height;
        const workAreaY = screen.getPrimaryDisplay().workArea.y;
        const spaceAtTop = workAreaY;
        const spaceAtBottom = screenHeight - workAreaY - workAreaHeight;

        // https://github.com/mistermicheels/current-task/issues/1
        const defaultWindowHeight = Math.max(spaceAtTop, spaceAtBottom, 38);
        let defaultWindowY;

        if (spaceAtTop > spaceAtBottom) {
            defaultWindowY = 0;
        } else {
            defaultWindowY = screenHeight - defaultWindowHeight;
        }

        this._defaultWindowPlacement = {
            width: screenWidth * 0.25,
            height: defaultWindowHeight,
            x: screenWidth * 0.5,
            y: defaultWindowY,
        };

        this._naggingWindowPlacement = {
            width: screenWidth * 0.5,
            height: screenHeight * 0.5,
            x: screenWidth * 0.25,
            y: screenHeight * 0.25,
        };
    }

    _initializeWindow() {
        this._browserWindow = new BrowserWindow({
            ...this._defaultWindowPlacement,
            frame: false,
            skipTaskbar: true,
            fullscreenable: false,
            maximizable: false,
            minimizable: false,
            closable: false,
            movable: false,
            resizable: false,
            focusable: false,
            webPreferences: WEB_PREFERENCES_FOR_WINDOW,
        });

        this._browserWindow.setAlwaysOnTop(true, "pop-up-menu");

        this._browserWindow.loadFile(
            path.join(__dirname, "../renderer/app-window/app-window.html")
        );
    }

    _isFullyWithinWorkArea() {
        const windowBounds = this._browserWindow.getBounds();
        const workAreaBounds = screen.getDisplayMatching(windowBounds).workArea;

        return (
            windowBounds.x >= workAreaBounds.x &&
            windowBounds.y >= workAreaBounds.y &&
            windowBounds.x + windowBounds.width <= workAreaBounds.x + workAreaBounds.width &&
            windowBounds.y + windowBounds.height <= workAreaBounds.y + workAreaBounds.height
        );
    }

    /**
     * @param {Status} status
     * @param {string} message
     */
    updateStatusAndMessage(status, message) {
        this._browserWindow.webContents.send("fromMain", { status, message });
    }

    /** @param {boolean} shouldNag */

    setNaggingMode(shouldNag) {
        if (shouldNag && !this._naggingModeEnabled) {
            this._updateDefaultWindowPlacementFromCurrent();
            this._naggingModeEnabled = true;
            this._applyNaggingModeEnabled();
        } else if (!shouldNag && this._naggingModeEnabled) {
            this._naggingModeEnabled = false;
            this._applyNaggingModeEnabled();
        }
    }

    _updateDefaultWindowPlacementFromCurrent() {
        const currentSize = this._browserWindow.getSize();
        const currentPostion = this._browserWindow.getPosition();

        this._defaultWindowPlacement = {
            width: currentSize[0],
            height: currentSize[1],
            x: currentPostion[0],
            y: currentPostion[1],
        };
    }

    _applyNaggingModeEnabled() {
        const relevantPlacement = this._naggingModeEnabled
            ? this._naggingWindowPlacement
            : this._defaultWindowPlacement;

        this._browserWindow.setMovable(true);
        this._browserWindow.setResizable(true);
        this._browserWindow.setSize(relevantPlacement.width, relevantPlacement.height);
        this._browserWindow.setPosition(relevantPlacement.x, relevantPlacement.y);

        this._applyMovingResizingEnabled();
    }

    /** @param {boolean} shouldHide */
    setHiddenMode(shouldHide) {
        if (shouldHide && !this._hiddenModeEnabled) {
            this._hiddenModeEnabled = true;
            this._browserWindow.hide();
        } else if (!shouldHide && this._hiddenModeEnabled) {
            this._hiddenModeEnabled = false;
            this._browserWindow.show();
        }
    }

    toggleMovingResizingEnabled() {
        this._movingResizingEnabled = !this._movingResizingEnabled;
        this._applyMovingResizingEnabled();
    }

    isMovingResizingEnabled() {
        return this._movingResizingEnabled;
    }

    _applyMovingResizingEnabled() {
        const windowMovableAndResizable = this._movingResizingEnabled && !this._naggingModeEnabled;
        this._browserWindow.setMovable(windowMovableAndResizable);
        this._browserWindow.setResizable(windowMovableAndResizable);
    }

    resetPositionAndSize() {
        this._initializeWindowPlacements();
        this._applyNaggingModeEnabled();
    }

    /** @param {string} message */
    showInfoModal(message) {
        dialog.showMessageBox(this._browserWindow, {
            type: "info",
            message,
        });
    }

    /** @param {InputDialogField[]} fields */
    async openInputDialogAndGetResult(fields) {
        if (this._hasOpenInputDialog) {
            return undefined;
        }

        this._hasOpenInputDialog = true;

        const dialogWindow = new BrowserWindow({
            width: DIALOG_WINDOW_WIDTH,
            height: 100,
            parent: this._browserWindow,
            webPreferences: WEB_PREFERENCES_FOR_WINDOW,
            show: false,
        });

        dialogWindow.removeMenu();
        const dialogFilePath = path.join(__dirname, "../renderer/input-dialog/input-dialog.html");
        await dialogWindow.loadFile(dialogFilePath);
        dialogWindow.webContents.send("fromMain", { fields });

        ipcMain.once("dialogHeight", (_event, data) => {
            dialogWindow.setContentSize(DIALOG_WINDOW_WIDTH, data.height);
            dialogWindow.show();
        });

        const resultPromise = new Promise((resolve) => {
            ipcMain.once("dialogResult", (_event, data) => {
                resolve(data.result);
                dialogWindow.close();
            });
        });

        const closedPromise = new Promise((resolve) => {
            dialogWindow.once("closed", () => {
                resolve(undefined);
                this._hasOpenInputDialog = false;
            });
        });

        return Promise.race([resultPromise, closedPromise]);
    }

    notifyTrayMenuOpened() {
        this._trayMenuOpened = true;
    }

    notifyTrayMenuClosed() {
        this._trayMenuOpened = false;
    }
}

module.exports = AppWindow;
