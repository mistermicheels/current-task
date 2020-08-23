const electronLog = require("electron-log");

const DEFAULT_LOG_LEVEL = "info";
const DETAILED_LOG_LEVEL = "silly";

class Logger {
    constructor() {
        this._log = electronLog.create("Logger");
        this._log.transports.console.level = DEFAULT_LOG_LEVEL;
        this._log.transports.file.level = DEFAULT_LOG_LEVEL;
    }

    enableLoggingUnhandledErrorsAndRejections() {
        this._log.catchErrors();
    }

    debug(...params) {
        this._log.debug(...params);
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
        this._log.transports.console.level = DETAILED_LOG_LEVEL;
        this._log.transports.file.level = DETAILED_LOG_LEVEL;
        this.info("Detailed logging enabled");
    }

    disableDetailedLogging() {
        this._isDetailedLoggingEnabled = false;
        this._log.transports.console.level = DEFAULT_LOG_LEVEL;
        this._log.transports.file.level = DEFAULT_LOG_LEVEL;
        this.info("Detailed logging disabled");
    }

    isDetailedLoggingEnabled() {
        return this._isDetailedLoggingEnabled;
    }

    getLogFilePath() {
        return this._log.transports.file.getFile().path;
    }
}

module.exports = Logger;
