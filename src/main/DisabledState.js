const moment = require("moment");

class DisabledState {
    constructor() {
        this._disabledUntil = undefined;
        this._reason = undefined;
    }

    /** @param {moment.Moment} now */
    update(now) {
        if (this._disabledUntil && this._disabledUntil.isBefore(now)) {
            this._disabledUntil = undefined;
        }
    }

    /**
     * @param {number} minutes
     * @param {moment.Moment} now
     */
    disableAppForMinutes(minutes, now) {
        this._disabledUntil = moment(now).add(minutes, "m");
    }

    /**
     * @param {string} timeString
     * @param {moment.Moment} now
     * @param {string} reason
     */
    disableAppUntil(timeString, now, reason) {
        const momentFromTimeString = moment(timeString, "HH:mm");

        if (momentFromTimeString.isAfter(now)) {
            this._disabledUntil = momentFromTimeString;
        } else {
            this._disabledUntil = momentFromTimeString.add(1, "days");
        }

        this._reason = reason;
    }

    enableApp() {
        this._disabledUntil = undefined;
        this._reason = undefined;
    }

    isAppDisabled() {
        return !!this._disabledUntil;
    }

    getDisabledUntil() {
        if (this._disabledUntil) {
            return this._disabledUntil.clone();
        } else {
            return undefined;
        }
    }

    getReason() {
        return this._reason;
    }
}

module.exports = DisabledState;
