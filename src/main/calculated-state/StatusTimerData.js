/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../configuration/Status").Status } Status */

const DateTimeHelper = require("../util/DateTimeHelper");

class StatusTimerData {
    /** @param {Moment} now */
    constructor(now) {
        this._dateTimeHelper = new DateTimeHelper();
        this.reset(now);
    }

    /** @param {Moment} now */
    reset(now) {
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
