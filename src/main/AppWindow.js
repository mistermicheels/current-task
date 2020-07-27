const { BrowserWindow, screen } = require("electron");
const path = require("path");

const ENSURE_ON_TOP_INTERVAL = 1000;

class AppWindow {
    constructor() {
        this._initializeWindowPlacements();
        this._initializeWindow();

        this._naggingModeEnabled = false;
        this._hiddenModeEnabled = false;

        setInterval(() => {
            if (!this._hiddenModeEnabled) {
                this._browserWindow.moveTop();
            }
        }, ENSURE_ON_TOP_INTERVAL);
    }

    _initializeWindowPlacements() {
        const screenWidth = screen.getPrimaryDisplay().bounds.width;
        const screenHeight = screen.getPrimaryDisplay().bounds.height;
        const workingAreaHeight = screen.getPrimaryDisplay().workArea.height;
        const taskbarHeight = screenHeight - workingAreaHeight;

        // https://github.com/mistermicheels/one-goal/issues/1
        const defaultWindowHeight = Math.max(taskbarHeight, 38);

        this._defaultWindowPlacement = {
            width: screenWidth * 0.25,
            height: defaultWindowHeight,
            x: screenWidth * 0.5,
            y: screenHeight - defaultWindowHeight,
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
        this._browserWindow.setResizable(false);
        this._browserWindow.setFocusable(false);
    }

    updateStatusAndMessage(status, message) {
        this._browserWindow.webContents.send("fromMain", { status, message });
    }

    setNaggingMode(shouldNag) {
        if (shouldNag && !this._naggingModeEnabled) {
            this._naggingModeEnabled = true;
            this._applyWindowPlacement(this._naggingWindowPlacement);
        } else if (!shouldNag && this._naggingModeEnabled) {
            this._naggingModeEnabled = false;
            this._applyWindowPlacement(this._defaultWindowPlacement);
        }
    }

    _applyWindowPlacement(windowPlacement) {
        this._browserWindow.setResizable(true);
        this._browserWindow.setSize(windowPlacement.width, windowPlacement.height);
        this._browserWindow.setPosition(windowPlacement.x, windowPlacement.y);
        this._browserWindow.setResizable(false);
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
}

module.exports = AppWindow;
