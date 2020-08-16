const electronLog = require("electron-log");

class Logger {
    constructor() {
        this._log = electronLog.create("Logger");
        this._log.transports.console.level = "warn";
        this._log.transports.file.level = "warn";
    }

    enableLoggingUnhandledErrorsAndRejections() {
        this._log.catchErrors();
    }

    info(...params) {
        this._log.info(...params);
    }

    warn(...params) {
        this._log.warn(...params);
    }

    error(...params) {
        this._log.error(...params);
    }

    enableDetailedLogging() {
        this._isDetailedLoggingEnabled = true;
        this._log.transports.console.level = "silly";
        this._log.transports.file.level = "silly";
        this.info("Detailed logging enabled");
    }

    disableDetailedLogging() {
        this.info("Disabling detailed logging");
        this._isDetailedLoggingEnabled = false;
        this._log.transports.console.level = "warn";
        this._log.transports.file.level = "warn";
    }

    isDetailedLoggingEnabled() {
        return this._isDetailedLoggingEnabled;
    }

    getLogFilePath() {
        return this._log.transports.file.getFile().path;
    }
}

module.exports = Logger;
