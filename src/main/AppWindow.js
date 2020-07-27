//@ts-check

const { dialog, BrowserWindow, screen } = require("electron");
const path = require("path");

const ENSURE_ON_TOP_INTERVAL = 1000;

class AppWindow {
    constructor() {
        this._initializeWindowPlacements();
        this._initializeWindow();

        this._naggingModeEnabled = false;
        this._hiddenModeEnabled = false;
        this._movingResizingEnabled = false;

        setInterval(() => {
            if (!this._hiddenModeEnabled) {
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
            webPreferences: {
                // https://stackoverflow.com/a/59888788
                nodeIntegration: false, // is default value after Electron v5
                contextIsolation: true, // protect against prototype pollution
                enableRemoteModule: false, // turn off remote
                preload: path.join(__dirname, "preload.js"), // use a preload script
            },
        });

        this._browserWindow.loadFile(path.join(__dirname, "../renderer/renderer.html"));

        this._browserWindow.setSkipTaskbar(true);
        this._browserWindow.setAlwaysOnTop(true, "pop-up-menu");
        this._browserWindow.setVisibleOnAllWorkspaces(true);
        this._browserWindow.setFullScreenable(false);
        this._browserWindow.setMovable(false);
        this._browserWindow.setResizable(false);
        this._browserWindow.setFocusable(false);
    }

    updateStatusAndMessage(status, message) {
        this._browserWindow.webContents.send("fromMain", { status, message });
    }

    setNaggingMode(shouldNag) {
        if (shouldNag && !this._naggingModeEnabled) {
            this._updateDefaultWindowPlacementFromCurrent();
            this._naggingModeEnabled = true;
            this._applyWindowPlacement(this._naggingWindowPlacement);
        } else if (!shouldNag && this._naggingModeEnabled) {
            this._naggingModeEnabled = false;
            this._applyWindowPlacement(this._defaultWindowPlacement);
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

    _applyWindowPlacement(windowPlacement) {
        this._browserWindow.setMovable(true);
        this._browserWindow.setResizable(true);
        this._browserWindow.setSize(windowPlacement.width, windowPlacement.height);
        this._browserWindow.setPosition(windowPlacement.x, windowPlacement.y);

        this._applyMovingResizingEnabled();
    }

    setHiddenMode(shouldHide) {
        if (shouldHide && !this._hiddenModeEnabled) {
            this._hiddenModeEnabled = true;
            this._browserWindow.hide();
        } else if (!shouldHide && this._hiddenModeEnabled) {
            this._hiddenModeEnabled = false;
            this._browserWindow.show();
        }
    }

    setMovingResizingEnabled(shouldEnable) {
        if (this._movingResizingEnabled !== shouldEnable) {
            this._movingResizingEnabled = shouldEnable;
            this._applyMovingResizingEnabled();
        }
    }

    _applyMovingResizingEnabled() {
        const windowMovableAndResizable = this._movingResizingEnabled && !this._naggingModeEnabled;
        this._browserWindow.setMovable(windowMovableAndResizable);
        this._browserWindow.setResizable(windowMovableAndResizable);
    }

    showInfoModal(message) {
        dialog.showMessageBox(this._browserWindow, {
            type: "info",
            message,
        });
    }
}

module.exports = AppWindow;
