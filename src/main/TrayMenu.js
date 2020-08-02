//@ts-check

/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("./types/Status").Status } Status */
/** @typedef { import("./types/TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

const { app, Menu, Tray } = require("electron");
const path = require("path");

class TrayMenu {
    /**
     * @param {TrayMenuBackend} backend
     * @param {boolean} allowClosing
     */
    constructor(backend, allowClosing) {
        this._backend = backend;
        this._allowClosing = allowClosing;

        this._status = "";
        this._message = "";
        this._naggingEnabled = false;
        this._downtimeEnabled = false;

        this._movingResizingEnabled = false;
        this._disabledUntil = undefined;

        this._tray = new Tray(path.join(__dirname, "../../logo/current-task-logo.png"));
        this._tray.setToolTip("current-task");
        this._updateContextMenu();
    }

    _updateContextMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: `Advanced`,
                submenu: [
                    {
                        label: `Status: ${this._status}`,
                        type: "normal",
                        enabled: false,
                    },
                    {
                        label: `Message: ${this._getTruncatedMessage()}`,
                        type: "normal",
                        enabled: false,
                    },
                    {
                        label: `Nagging enabled: ${this._naggingEnabled}`,
                        type: "normal",
                        enabled: false,
                    },
                    {
                        label: `Downtime enabled: ${this._downtimeEnabled}`,
                        type: "normal",
                        enabled: false,
                    },
                    {
                        type: "separator",
                    },
                    {
                        label: "Show detailed state",
                        type: "normal",
                        click: () => this._backend.showFullState(),
                    },
                    {
                        label: "Show configuration file",
                        type: "normal",
                        click: () => this._backend.showConfigFile(),
                    },
                ],
            },
            {
                type: "separator",
            },
            {
                label: "Allow moving and resizing (when not nagging)",
                type: "checkbox",
                checked: this._movingResizingEnabled,
                click: () => this._toggleMovingResizingEnabled(),
            },
            {
                label: "Reset position and size",
                type: "normal",
                click: () => this._backend.resetPositionAndSize(),
            },
            {
                type: "separator",
            },
            {
                label: "Disable",
                submenu: [
                    {
                        label: "Disable for 30 minutes",
                        type: "normal",
                        click: () => this._backend.disableForMinutes(30),
                    },
                    {
                        label: "Disable for 1 hour",
                        type: "normal",
                        click: () => this._backend.disableForMinutes(60),
                    },
                    {
                        label: "Disable for 2 hours",
                        type: "normal",
                        click: () => this._backend.disableForMinutes(120),
                    },
                ],
                enabled: !this._disabledUntil,
            },
            {
                label: this._getDisableStatusLabel(),
                type: "normal",
                enabled: false,
            },
            {
                label: "Enable again",
                type: "normal",
                enabled: !!this._disabledUntil,
                click: () => this._backend.enable(),
            },
            {
                type: "separator",
            },
            {
                label: this._allowClosing ? "Close" : "Close (disabled)",
                type: "normal",
                click: () => app.exit(),
                enabled: this._allowClosing,
            },
        ]);

        // depending on the platform, we need to call setContextMenu whenever any menu item changes
        this._tray.setContextMenu(contextMenu);
    }

    _getTruncatedMessage() {
        if (this._message.length <= 40) {
            return this._message;
        } else {
            return this._message.substring(0, 40) + "…";
        }
    }

    _toggleMovingResizingEnabled() {
        this._movingResizingEnabled = !this._movingResizingEnabled;
        this._backend.setMovingResizingEnabled(this._movingResizingEnabled);
        this._updateContextMenu();
    }

    _getDisableStatusLabel() {
        if (this._disabledUntil) {
            return `Disabled until ${this._disabledUntil.format("HH:mm:ss")}`;
        } else {
            return "Currently not disabled";
        }
    }

    /**
     * @param {Status} status
     * @param {string} message
     */
    updateStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
        this._updateContextMenu();
    }

    /**
     * @param {boolean} naggingEnabled
     * @param {boolean} downtimeEnabled
     */
    updateWindowAppareance(naggingEnabled, downtimeEnabled) {
        this._naggingEnabled = naggingEnabled;
        this._downtimeEnabled = downtimeEnabled;
        this._updateContextMenu();
    }

    /**
     * @param {Moment} disabledUntil
     */
    updateDisabledUntil(disabledUntil) {
        this._disabledUntil = disabledUntil;
        this._updateContextMenu();
    }
}

module.exports = TrayMenu;
