const { BrowserWindow, screen } = require("electron");
const path = require("path");

class AppWindow {
    constructor() {
        this._initializeWindowPlacements();
        this._initializeWindow();

        this._naggingModeEnabled = false;
        this._shouldNagBasedOnTasksState = false;
        this._shouldNagBasedOnTime = false;

        setInterval(() => {
            this._browserWindow.moveTop();
            this._checkTimeBasedNagging();
        }, 1000);
    }

    _initializeWindowPlacements() {
        const screenWidth = screen.getPrimaryDisplay().bounds.width;
        const screenHeight = screen.getPrimaryDisplay().bounds.height;
        const workingAreaHeight = screen.getPrimaryDisplay().workArea.height;
        const taskbarHeight = screenHeight - workingAreaHeight;

        this._defaultWindowPlacement = {
            width: screenWidth * 0.25,
            height: taskbarHeight,
            x: screenWidth * 0.5,
            y: workingAreaHeight,
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

    setTasksState(tasksState) {
        this._browserWindow.webContents.send("fromMain", tasksState);

        this._shouldNagBasedOnTasksState = tasksState.state !== "ok";
        this._adjustNagging();
    }

    _checkTimeBasedNagging() {
        const currentDate = new Date();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();

        this._shouldNagBasedOnTime =
            (minutes >= 25 && minutes < 30) ||
            minutes >= 55 ||
            (minutes % 5 === 0 && seconds <= 15);

        this._adjustNagging();
    }

    _adjustNagging() {
        const shouldNag = this._shouldNagBasedOnTasksState || this._shouldNagBasedOnTime;

        if (shouldNag && !this._naggingModeEnabled) {
            this._applyWindowPlacement(this._naggingWindowPlacement);
            this._naggingModeEnabled = true;
        } else if (!shouldNag && this._naggingModeEnabled) {
            this._applyWindowPlacement(this._defaultWindowPlacement);
            this._naggingModeEnabled = false;
        }
    }

    _applyWindowPlacement(windowPlacement) {
        this._browserWindow.setResizable(true);
        this._browserWindow.setSize(windowPlacement.width, windowPlacement.height);
        this._browserWindow.setPosition(windowPlacement.x, windowPlacement.y);
        this._browserWindow.setResizable(false);
    }
}

module.exports = AppWindow;
