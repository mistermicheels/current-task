/** @typedef { import("moment").Moment } Moment */

const { powerMonitor } = require("electron");

const DateTimeHelper = require("./util/DateTimeHelper");

class IdleTimeTracker {
    /**
     * @param {number} sleepDetectionThresholdSeconds
     * @param {Moment} now
     */
    constructor(sleepDetectionThresholdSeconds, now) {
        this._sleepDetectionThresholdSeconds = sleepDetectionThresholdSeconds;
        this._lastUpdateTimestamp = now;
        this._dateTimeHelper = new DateTimeHelper();
    }

    update(now) {
        const secondsSinceLastUpdate = this._dateTimeHelper.getSecondsSinceTimestampRounded(
            this._lastUpdateTimestamp,
            now
        );

        this._wasAsleep = secondsSinceLastUpdate >= this._sleepDetectionThresholdSeconds;
        this._idleSeconds = Math.max(secondsSinceLastUpdate, powerMonitor.getSystemIdleTime());

        this._lastUpdateTimestamp = now;
    }

    wasAsleepBeforeLastUpdate() {
        return this._wasAsleep;
    }

    getIdleSeconds() {
        return this._idleSeconds;
    }
}

module.exports = IdleTimeTracker;
