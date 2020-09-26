/** @typedef { import("electron").MenuItemConstructorOptions } MenuItemConstructorOptions */
/** @typedef { import("moment").Moment } Moment */

/** @typedef { import("./configuration/IntegrationConfiguration").IntegrationType} IntegrationType */
/** @typedef { import("./configuration/Status").Status } Status */
/** @typedef { import("./TrayMenuBackend").TrayMenuBackend } TrayMenuBackend */

const os = require("os");
const { Menu, Tray } = require("electron");
const path = require("path");
const moment = require("moment");

const UPDATE_IMAGE_INTERVAL = 1000;

const relativeTrayIconsPath = os.platform() === "win32" ? "../../logo/tray" : "../../logo/tray/mac";

const imagePaths = {
    normal: path.join(__dirname, relativeTrayIconsPath, "normal.png"),
    disabled1: path.join(__dirname, relativeTrayIconsPath, "disabled1.png"),
    disabled2: path.join(__dirname, relativeTrayIconsPath, "disabled2.png"),
    disabled3: path.join(__dirname, relativeTrayIconsPath, "disabled3.png"),
    disabled4: path.join(__dirname, relativeTrayIconsPath, "disabled4.png"),
    disabled5: path.join(__dirname, relativeTrayIconsPath, "disabled5.png"),
};

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
     * @param {boolean} state.detailedAppStateLoggingEnabled
     * @param {boolean} state.detailedIntegrationLoggingEnabled
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
        this._detailedAppStateLoggingEnabled = state.detailedAppStateLoggingEnabled;
        this._detailedIntegrationLoggingEnabled = state.detailedIntegrationLoggingEnabled;
        this._movingResizingEnabled = state.movingResizingEnabled;
        this._disabledUntil = state.disabledUntil;
        this._disabledReason = state.disabledReason;

        this._currentImagePath = imagePaths.normal;

        this._tray = new Tray(imagePaths.normal);
        this._updateImage();
        this._updateTooltip();
        this._updateContextMenu();

        this._updateImageIntervalId = setInterval(() => this._updateImage(), UPDATE_IMAGE_INTERVAL);
    }

    _updateImage() {
        const targetImagePath = this._getImagePathBasedOnDisabledUntil();

        if (this._currentImagePath !== targetImagePath) {
            this._tray.setImage(targetImagePath);
            this._currentImagePath = targetImagePath;
        }
    }

    _getImagePathBasedOnDisabledUntil() {
        if (!this._disabledUntil) {
            return imagePaths.normal;
        }

        const remainingMinutes = this._disabledUntil.diff(moment(), "minutes");

        if (remainingMinutes < 15) {
            return imagePaths.disabled1;
        } else if (remainingMinutes < 30) {
            return imagePaths.disabled2;
        } else if (remainingMinutes < 60) {
            return imagePaths.disabled3;
        } else if (remainingMinutes < 120) {
            return imagePaths.disabled4;
        } else {
            return imagePaths.disabled5;
        }
    }

    _updateTooltip() {
        let tooltip = "CurrentTask";

        if (this._disabledUntil) {
            const timeString = this._formatTime(this._disabledUntil);

            if (this._disabledReason) {
                tooltip = `CurrentTask, disabled until ${timeString} (${this._disabledReason})`;
            } else {
                tooltip = `CurrentTask, disabled until ${timeString}`;
            }
        }

        this._tray.setToolTip(tooltip);
    }

    /** @param {Moment} time */
    _formatTime(time) {
        return time.format("HH:mm:ss");
    }

    _updateContextMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: "About CurrentTask",
                click: () => this._backend.showAbout(),
            },
            {
                type: "separator",
            },
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
                    {
                        label: "Reload advanced configuration file",
                        click: () => this._backend.reloadAdvancedConfigFile(),
                    },
                    {
                        label: "Show log file",
                        click: () => this._backend.showLogFile(),
                    },
                    {
                        label: "Enable detailed application state logging",
                        type: "checkbox",
                        checked: this._detailedAppStateLoggingEnabled,
                        click: () => this._backend.toggleDetailedAppStateLoggingEnabled(),
                    },
                    {
                        label: "Enable detailed integration logging",
                        type: "checkbox",
                        checked: this._detailedIntegrationLoggingEnabled,
                        click: () => this._backend.toggleDetailedIntegrationLoggingEnabled(),
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
                click: () => this._backend.close(),
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
                    label: "Configure integration ...",
                    click: () => this._backend.configureIntegration(),
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
            const timeString = this._formatTime(this._disabledUntil);

            if (this._disabledReason) {
                return `Disabled until ${timeString} (${this._disabledReason})`;
            } else {
                return `Disabled until ${timeString}`;
            }
        } else {
            return "Currently not disabled";
        }
    }

    /**
     * @param {object} options
     * @param {boolean} options.allowQuickDisable
     * @param {boolean} options.allowClosing
     */
    updateOptions(options) {
        this._allowQuickDisable = options.allowQuickDisable;
        this._allowClosing = options.allowClosing;
        this._updateContextMenu();
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

    /** @param {boolean} detailedAppStateLoggingEnabled */
    updateDetailedAppStateLoggingEnabled(detailedAppStateLoggingEnabled) {
        this._detailedAppStateLoggingEnabled = detailedAppStateLoggingEnabled;
        this._updateContextMenu();
    }

    /** @param {boolean} detailedIntegrationLoggingEnabled */
    updateDetailedIntegrationLoggingEnabled(detailedIntegrationLoggingEnabled) {
        this._detailedIntegrationLoggingEnabled = detailedIntegrationLoggingEnabled;
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
        this._updateImage();
        this._updateTooltip();
        this._updateContextMenu();
    }

    destroy() {
        clearInterval(this._updateImageIntervalId);
        this._tray.destroy();
    }
}

module.exports = TrayMenu;
