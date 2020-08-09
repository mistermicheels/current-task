//@ts-check

/** @typedef { import("electron").MenuItemConstructorOptions } MenuItemConstructorOptions */
/** @typedef { import("moment").Moment } Moment */

/** @typedef { import("../types/InternalConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("../types/Status").Status } Status */
/** @typedef { import("../types/TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

const { app, Menu, Tray } = require("electron");
const path = require("path");

class TrayMenu {
    /**
     * @param {TrayMenuBackend} backend
     * @param {object} options
     * @param {boolean} options.allowQuickDisable
     * @param {boolean} options.allowClosing
     * @param {object} state
     * @param {IntegrationType} state.integrationType
     * @param {Status} state.status
     * @param {string} state.message
     * @param {boolean} state.naggingEnabled
     * @param {boolean} state.downtimeEnabled
     * @param {boolean} state.movingResizingEnabled
     * @param {Moment} state.disabledUntil
     * @param {string} state.disabledReason
     */
    constructor(backend, options, state) {
        this._backend = backend;

        this._allowQuickDisable = options.allowQuickDisable;
        this._allowClosing = options.allowClosing;

        this._integrationType = state.integrationType;
        this._status = state.status;
        this._message = state.message;
        this._naggingEnabled = state.naggingEnabled;
        this._downtimeEnabled = state.downtimeEnabled;
        this._movingResizingEnabled = state.movingResizingEnabled;
        this._disabledUntil = state.disabledUntil;
        this._disabledReason = state.disabledReason;

        this._tray = new Tray(path.join(__dirname, "../../logo/current-task-logo.png"));
        this._tray.setToolTip("CurrentTask");
        this._tray.on("double-click", () => this._backend.refreshFromIntegration());
        this._updateContextMenu();
    }

    _updateContextMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: `Integration type`,
                submenu: [
                    {
                        label: "Manual",
                        type: "radio",
                        checked: this._integrationType === "manual",
                        click: () => this._backend.changeIntegrationType("manual"),
                    },
                    {
                        label: "Todoist",
                        type: "radio",
                        checked: this._integrationType === "todoist",
                        click: () => this._backend.changeIntegrationType("todoist"),
                    },
                ],
            },
            ...this._getIntegrationSpecificMenuItems(),
            {
                type: "separator",
            },
            {
                label: `Advanced`,
                submenu: [
                    {
                        label: `Status: ${this._status}`,
                        enabled: false,
                    },
                    {
                        label: this._truncateLabel(`Message: ${this._message}`, 50),
                        enabled: false,
                    },
                    {
                        label: `Nagging enabled: ${this._naggingEnabled}`,
                        enabled: false,
                    },
                    {
                        label: `Downtime enabled: ${this._downtimeEnabled}`,
                        enabled: false,
                    },
                    {
                        type: "separator",
                    },
                    {
                        label: "Show detailed state",
                        click: () => this._backend.showFullState(),
                    },
                    {
                        label: "Show advanced configuration file",
                        click: () => this._backend.showAdvancedConfigFile(),
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
                click: () => this._backend.toggleMovingResizingEnabled(),
            },
            {
                label: "Reset position and size",
                click: () => this._backend.resetPositionAndSize(),
            },
            {
                type: "separator",
            },
            {
                label: "Disable",
                submenu: [
                    {
                        label: "Disable for 15 minutes",
                        enabled: this._allowQuickDisable,
                        click: () => this._backend.disableForMinutes(15),
                    },
                    {
                        label: "Disable for 30 minutes",
                        enabled: this._allowQuickDisable,
                        click: () => this._backend.disableForMinutes(30),
                    },
                    {
                        label: "Disable for 1 hour",
                        enabled: this._allowQuickDisable,
                        click: () => this._backend.disableForMinutes(60),
                    },
                    {
                        label: "Disable for 2 hours",
                        enabled: this._allowQuickDisable,
                        click: () => this._backend.disableForMinutes(120),
                    },
                    {
                        label: "Disable until ...",
                        click: () => this._backend.disableUntilSpecificTime(),
                    },
                ],
                enabled: !this._disabledUntil,
            },
            {
                label: this._truncateLabel(this._getDisableStatusLabel(), 50),
                enabled: false,
            },
            {
                label: "Enable again",
                enabled: !!this._disabledUntil,
                click: () => this._backend.enable(),
            },
            {
                type: "separator",
            },
            {
                label: "Close",
                click: () => app.exit(),
                enabled: this._allowClosing,
            },
        ]);

        contextMenu.on("menu-will-show", () => {
            this._backend.notifyTrayMenuOpened();
        });

        contextMenu.on("menu-will-close", () => {
            this._backend.notifyTrayMenuClosed();
        });

        // depending on the platform, we need to call setContextMenu whenever any menu item changes
        this._tray.setContextMenu(contextMenu);
    }

    /** @returns  {MenuItemConstructorOptions[]} */
    _getIntegrationSpecificMenuItems() {
        if (this._integrationType === "manual") {
            return [
                {
                    label: "Set current task",
                    click: () => this._backend.setManualCurrentTask(),
                },
                {
                    label: "Remove current task",
                    click: () => this._backend.removeManualCurrentTask(),
                },
            ];
        } else {
            return [
                {
                    label: "Configure integration",
                    click: () => this._backend.configureIntegration(),
                },
                {
                    label: "Refresh data immediately [double-click tray icon]",
                    click: () => this._backend.refreshFromIntegration(),
                },
            ];
        }
    }

    _truncateLabel(label, characters) {
        if (label.length <= characters) {
            return label;
        } else {
            return label.substring(0, characters) + "…";
        }
    }

    _getDisableStatusLabel() {
        if (this._disabledUntil) {
            const timeString = this._disabledUntil.format("HH:mm:ss");

            if (this._disabledReason) {
                return `Disabled until ${timeString} (${this._disabledReason})`;
            } else {
                return `Disabled until ${timeString}`;
            }
        } else {
            return "Currently not disabled";
        }
    }

    /** @param {IntegrationType} integrationType */
    updateIntegrationType(integrationType) {
        this._integrationType = integrationType;
        this._updateContextMenu();
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
    updateWindowAppearance(naggingEnabled, downtimeEnabled) {
        this._naggingEnabled = naggingEnabled;
        this._downtimeEnabled = downtimeEnabled;
        this._updateContextMenu();
    }

    /** @param {boolean} movingResizingEnabled */
    updateMovingResizingEnabled(movingResizingEnabled) {
        this._movingResizingEnabled = movingResizingEnabled;
        this._updateContextMenu();
    }

    /**
     * @param {Moment} disabledUntil
     * @param {string} reason
     */
    updateDisabledState(disabledUntil, reason) {
        this._disabledUntil = disabledUntil;
        this._disabledReason = reason;
        this._updateContextMenu();
    }
}

module.exports = TrayMenu;
