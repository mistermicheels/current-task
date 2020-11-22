const electronLog = require("electron-log");

class Logger {
    constructor() {
        this._log = electronLog.create("Logger");
        this._log.transports.console.level = "silly";
        this._log.transports.file.level = "silly";
        this._isDetailedStateCalculationLoggingEnabled = false;
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

    debugStateCalculation(...params) {
        if (this._isDetailedStateCalculationLoggingEnabled) {
            this._log.debug(...params);
        }
    }

    debugIntegration(...params) {
        if (this._isDetailedIntegrationLoggingEnabled) {
            this._log.debug(...params);
        }
    }

    toggleDetailedStateCalculationLoggingEnabled() {
        if (this._isDetailedStateCalculationLoggingEnabled) {
            this._isDetailedStateCalculationLoggingEnabled = false;
            this.info("Detailed state calculation logging disabled");
        } else {
            this._isDetailedStateCalculationLoggingEnabled = true;
            this.info("Detailed state calculation logging enabled");
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

    isDetailedStateCalculationLoggingEnabled() {
        return this._isDetailedStateCalculationLoggingEnabled;
    }

    isDetailedIntegrationLoggingEnabled() {
        return this._isDetailedIntegrationLoggingEnabled;
    }

    getLogFilePath() {
        return this._log.transports.file.getFile().path;
    }
}

module.exports = Logger;
