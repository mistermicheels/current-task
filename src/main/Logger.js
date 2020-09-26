const electronLog = require("electron-log");

class Logger {
    constructor() {
        this._log = electronLog.create("Logger");
        this._log.transports.console.level = "silly";
        this._log.transports.file.level = "silly";
        this._isDetailedAppStateLoggingEnabled = false;
        this._isDetailedIntegrationLoggingEnabled = false;
    }

    enableLoggingUnhandledErrorsAndRejections() {
        this._log.catchErrors();
    }

    error(...params) {
        this._log.error(...params);
    }

    warn(...params) {
        this._log.warn(...params);
    }

    info(...params) {
        this._log.info(...params);
    }

    debugAppState(...params) {
        if (this._isDetailedAppStateLoggingEnabled) {
            this._log.debug(...params);
        }
    }

    debugIntegration(...params) {
        if (this._isDetailedIntegrationLoggingEnabled) {
            this._log.debug(...params);
        }
    }

    toggleDetailedAppStateLoggingEnabled() {
        if (this._isDetailedAppStateLoggingEnabled) {
            this._isDetailedAppStateLoggingEnabled = false;
            this.info("Detailed application state logging disabled");
        } else {
            this._isDetailedAppStateLoggingEnabled = true;
            this.info("Detailed application state logging enabled");
        }
    }

    toggleDetailedIntegrationLoggingEnabled() {
        if (this._isDetailedIntegrationLoggingEnabled) {
            this._isDetailedIntegrationLoggingEnabled = false;
            this.info("Detailed integration logging disabled");
        } else {
            this._isDetailedIntegrationLoggingEnabled = true;
            this.info("Detailed integration logging enabled");
        }
    }

    isDetailedAppStateLoggingEnabled() {
        return this._isDetailedAppStateLoggingEnabled;
    }

    isDetailedIntegrationLoggingEnabled() {
        return this._isDetailedIntegrationLoggingEnabled;
    }

    getLogFilePath() {
        return this._log.transports.file.getFile().path;
    }
}

module.exports = Logger;
