/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("../Logger") } Logger */
/** @typedef { import("../../types/DefaultWindowBoundsListener").DefaultWindowBoundsListener } DefaultWindowBoundsListener */
/** @typedef { import("../../types/DialogInput").DialogInput } DialogInput */
/** @typedef { import("../../types/Status").Status } Status */

const os = require("os");
const { BrowserWindow, screen, ipcMain, nativeTheme } = require("electron");
const debounceFn = require("debounce-fn");

const windowWebPreferences = require("./windowWebPreferences");

const ENSURE_ON_TOP_INTERVAL = 1000;
const RESIZE_DEBOUNCE_INTERVAL = 50;

class AppWindow {
    /**
     * @param {boolean} [movingResizingEnabled]
     * @param {Rectangle} [existingDefaultWindowBounds]
     * @param {DefaultWindowBoundsListener} defaultWindowBoundsListener
     * @param {Logger} logger
     */
    constructor(
        movingResizingEnabled,
        existingDefaultWindowBounds,
        defaultWindowBoundsListener,
        logger
    ) {
        this._movingResizingEnabled = !!movingResizingEnabled;

        this._initializeWindowBounds();

        if (existingDefaultWindowBounds) {
            this._defaultWindowBounds = existingDefaultWindowBounds;
        }

        this._defaultWindowBoundsListener = defaultWindowBoundsListener;
        this._logger = logger;

        this._initializeWindow();
        this._naggingModeEnabled = false;
        this._hiddenModeEnabled = false;

        this._trayMenuOpened = false;
    }

    _initializeWindowBounds() {
        const primaryDisplay = screen.getPrimaryDisplay();
        const screenBounds = primaryDisplay.bounds;
        const workAreaBounds = primaryDisplay.workArea;

        this._defaultWindowBounds = this._getDefaultWindowBounds(screenBounds, workAreaBounds);

        this._naggingWindowBounds = {
            width: Math.round(screenBounds.width * 0.5),
            height: Math.round(screenBounds.height * 0.5),
            x: Math.round(screenBounds.width * 0.25),
            y: Math.round(screenBounds.height * 0.25),
        };
    }

    /**
     * @param {Rectangle} screenBounds
     * @param {Rectangle} workAreaBounds
     * @returns {Rectangle}
     */
    _getDefaultWindowBounds(screenBounds, workAreaBounds) {
        const spaceAtTop = workAreaBounds.y;
        const spaceAtBottom = screenBounds.height - spaceAtTop - workAreaBounds.height;

        let width;
        let height;
        let x;
        let y;

        if (os.platform() === "win32" && Math.max(spaceAtTop, spaceAtBottom) > 0) {
            // Windows with bottom or top taskbar, try to put window on right half of taskbar

            width = screenBounds.width * 0.25;
            x = screenBounds.width * 0.5;

            // https://github.com/mistermicheels/current-task/issues/1
            height = Math.max(spaceAtTop, spaceAtBottom, 38);

            if (spaceAtTop > spaceAtBottom) {
                y = 0;
            } else {
                y = screenBounds.height - height;
            }
        } else {
            // center window at bottom of work area

            width = workAreaBounds.width * 0.25;
            x = workAreaBounds.x + (workAreaBounds.width - width) / 2;
            height = 40;
            y = screenBounds.height - spaceAtBottom - height;
        }

        return {
            width: Math.round(width),
            height: Math.round(height),
            x: Math.round(x),
            y: Math.round(y),
        };
    }

    async _initializeWindow() {
        /** @type {BrowserWindow} */
        this._browserWindow = new BrowserWindow({
            ...this._defaultWindowBounds,
            frame: false,
            skipTaskbar: true,
            fullscreenable: false,
            maximizable: false,
            minimizable: false,
            closable: false,
            movable: false, // we do not use standard Electron move functionality, see _initializeMovingResizing
            resizable: this._movingResizingEnabled,
            focusable: false,
            webPreferences: windowWebPreferences,
            show: false,

            // on macOS, use customButtonsOnHover. otherwise, use the default.
            // customButtonsOnHover prevents some issues with mouse events related to standard toolbar buttons if window is resizable
            titleBarStyle: os.platform() === "darwin" ? "customButtonsOnHover" : "default",
        });

        if (os.platform() === "win32") {
            // above Windows taskbar
            this._browserWindow.setAlwaysOnTop(true, "pop-up-menu");
        } else {
            // below macOS dock
            this._browserWindow.setAlwaysOnTop(true, "modal-panel");
        }

        // load from magic global variable defined by Electron Forge Webpack plugin
        // @ts-ignore
        await this._browserWindow.loadURL(APP_WINDOW_WEBPACK_ENTRY);

        this._updateStyle();
        nativeTheme.on("updated", () => this._updateStyle());

        this._browserWindow.show();

        this._initializeMovingResizing();

        this._ensureOnTopIntervalId = setInterval(
            () => this._ensureOnTopIfNeeded(),
            ENSURE_ON_TOP_INTERVAL
        );
    }

    _updateStyle() {
        let useDarkStyle = false;

        if (os.platform() === "darwin" && !nativeTheme.shouldUseDarkColors) {
            // macOS in light mode, use dark style to make the window stand out
            useDarkStyle = true;
        }

        this._browserWindow.webContents.send("appWindowStyle", { useDarkStyle });
    }

    _initializeMovingResizing() {
        // custom dragging mechanism as workaround for the limitations of Electron's built-in dragging functionality
        // see also https://github.com/electron/electron/issues/1354#issuecomment-404348957
        // see also https://stackoverflow.com/questions/32894925/electron-resizing-a-frameless-window
        // see also https://www.electronjs.org/docs/api/frameless-window#context-menu

        // because of an Electron bug, we need to explicitly reset width & height and ignore size changes on move
        // see also https://github.com/electron/electron/issues/9477

        let windowIsMoving = false;

        ipcMain.on("appWindowMoving", (_event, { mouseXWithinWindow, mouseYWithinWindow }) => {
            if (!this._movingResizingEnabled) {
                return;
            }

            windowIsMoving = true;
            this._browserWindow.setResizable(false);

            const mousePositionOnScreen = screen.getCursorScreenPoint();

            this._browserWindow.setBounds({
                width: this._defaultWindowBounds.width,
                height: this._defaultWindowBounds.height,
                x: Math.round(mousePositionOnScreen.x - mouseXWithinWindow),
                y: Math.round(mousePositionOnScreen.y - mouseYWithinWindow),
            });
        });

        ipcMain.on("appWindowMoved", () => {
            windowIsMoving = false;
            this._applyMovingResizingEnabled();

            if (this._movingResizingEnabled) {
                this._captureDefaultWindowBounds({ ignoreSizeChanges: true });
            }
        });

        const resizeHandler = debounceFn(
            () => this._captureDefaultWindowBounds({ ignoreSizeChanges: false }),
            { wait: RESIZE_DEBOUNCE_INTERVAL }
        );

        this._browserWindow.on("resize", () => {
            if (!windowIsMoving) {
                resizeHandler();
            }
        });
    }

    /**
     * @param {object} options
     * @param {boolean} options.ignoreSizeChanges
     */
    _captureDefaultWindowBounds({ ignoreSizeChanges }) {
        if (this._naggingModeEnabled) {
            return;
        }

        const windowBounds = this._browserWindow.getBounds();

        if (ignoreSizeChanges) {
            windowBounds.width = this._defaultWindowBounds.width;
            windowBounds.height = this._defaultWindowBounds.height;
        }

        const defaultNeedsUpdate = Object.keys(windowBounds).some(
            (key) => windowBounds[key] !== this._defaultWindowBounds[key]
        );

        if (defaultNeedsUpdate) {
            this._defaultWindowBounds = windowBounds;
            this._defaultWindowBoundsListener.onDefaultWindowBoundsChanged(windowBounds);
        }
    }

    _ensureOnTopIfNeeded() {
        // when hovering the mouse over the Windows taskbar, the window can get hidden behind the taskbar
        const shouldEnsureOnTop =
            os.platform() === "win32" &&
            !this._trayMenuOpened &&
            !this._hiddenModeEnabled &&
            !this._isFullyWithinWorkArea();

        if (shouldEnsureOnTop) {
            this._browserWindow.moveTop();
        }
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
        this._browserWindow.webContents.send("statusAndMessage", { status, message });
    }

    /** @param {boolean} shouldNag */
    setNaggingMode(shouldNag) {
        if (shouldNag && !this._naggingModeEnabled) {
            this._captureDefaultWindowBounds({ ignoreSizeChanges: false });
            this._naggingModeEnabled = true;
            this._applyNaggingModeEnabled();
            this._logger.info("App window went into nagging mode");
        } else if (!shouldNag && this._naggingModeEnabled) {
            this._naggingModeEnabled = false;
            this._applyNaggingModeEnabled();
            this._logger.info("App window went out of nagging mode");
        }
    }

    _applyNaggingModeEnabled() {
        if (this._naggingModeEnabled) {
            this._browserWindow.setBounds(this._naggingWindowBounds);
        } else {
            this._browserWindow.setBounds(this._defaultWindowBounds);
        }

        this._applyMovingResizingEnabled();
    }

    /** @param {boolean} shouldHide */
    setHiddenMode(shouldHide) {
        if (shouldHide && !this._hiddenModeEnabled) {
            this._hiddenModeEnabled = true;
            this._browserWindow.hide();
            this._logger.info("App window went into hidden mode");
        } else if (!shouldHide && this._hiddenModeEnabled) {
            this._hiddenModeEnabled = false;
            this._browserWindow.show();
            this._logger.info("App window went out of hidden mode");
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
        this._browserWindow.setResizable(windowMovableAndResizable);

        // do not set movable here as we do not use standard Electron move functionality, see _initializeMovingResizing
    }

    resetPositionAndSize() {
        this._logger.info("Resetting app window position and size");
        this._initializeWindowBounds();
        // save initialized default bounds, even if we're currently in nagging mode
        this._defaultWindowBoundsListener.onDefaultWindowBoundsChanged(this._defaultWindowBounds);
        this._applyNaggingModeEnabled();
    }

    notifyTrayMenuOpened() {
        this._trayMenuOpened = true;
    }

    notifyTrayMenuClosed() {
        this._trayMenuOpened = false;
    }

    getBrowserWindow() {
        return this._browserWindow;
    }

    destroy() {
        clearInterval(this._ensureOnTopIntervalId);
        this._browserWindow.destroy();
    }
}

module.exports = AppWindow;
