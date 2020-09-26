/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../configuration/Status").Status } Status */

const DateTimeHelper = require("../util/DateTimeHelper");

// if the system sleeps/hibernates/... for a long time, we reset the status timers
// we are detecting this as a large amount of time between status timer updates
// while maybe not as "clean" as detecting sleep state changes directly, this approach is probably more robust
const SECONDS_SINCE_LAST_UPDATE_TRIGGERING_RESET = 60;

class StatusTimerData {
    /** @param {Moment} now */
    constructor(now) {
        this._dateTimeHelper = new DateTimeHelper();
        this.reset(now);
    }

    /** @param {Moment} now */
    reset(now) {
        this._lastUpdateTimestamp = now;
        this._lastStatus = undefined;
        this._lastStatusStartTimestamp = now;
        this._lastOkStatusTimestamp = now;
        this._secondsInCurrentStatus = 0;
        this._secondsSinceOkStatus = 0;
    }

    /**
     *
     * @param {Status} currentStatus
     * @param {Moment} now
     */
    updateFromCurrentStatus(currentStatus, now) {
        const secondsSinceLastUpdate = this._dateTimeHelper.getSecondsSinceTimestampRounded(
            this._lastUpdateTimestamp,
            now
        );

        if (secondsSinceLastUpdate >= SECONDS_SINCE_LAST_UPDATE_TRIGGERING_RESET) {
            this.reset(now);
        }

        this._lastUpdateTimestamp = now;

        if (currentStatus !== this._lastStatus) {
            this._lastStatus = currentStatus;
            this._lastStatusStartTimestamp = now;
        }

        if (currentStatus === "ok") {
            this._lastOkStatusTimestamp = now;
        }

        this._secondsInCurrentStatus = this._dateTimeHelper.getSecondsSinceTimestampRounded(
            this._lastStatusStartTimestamp,
            now
        );

        this._secondsSinceOkStatus = this._dateTimeHelper.getSecondsSinceTimestampRounded(
            this._lastOkStatusTimestamp,
            now
        );
    }

    getSecondsInCurrentStatus() {
        return this._secondsInCurrentStatus;
    }

    getSecondsSinceOkStatus() {
        return this._secondsSinceOkStatus;
    }
}

module.exports = StatusTimerData;
