const moment = require("moment");

class DisabledState {
    constructor() {
        this._disabledUntil = undefined;
        this._reason = undefined;
    }

    /** @param {moment.Moment} now */
    update(now) {
        if (this._disabledUntil && !this._disabledUntil.isAfter(now)) {
            this.enableApp();
        }
    }

    /**
     * @param {number} minutes
     * @param {moment.Moment} now
     */
    disableAppForMinutes(minutes, now) {
        this._disabledUntil = moment(now).add(minutes, "minutes");
    }

    /**
     * @param {string} timeString
     * @param {moment.Moment} now
     * @param {string} [reason]
     */
    disableAppUntil(timeString, now, reason) {
        const momentFromTimeString = moment(timeString, "HH:mm");

        const specifiedTimeToday = moment(momentFromTimeString)
            .set("year", now.get("year"))
            .set("dayOfYear", now.get("dayOfYear"));

        if (specifiedTimeToday.isAfter(now)) {
            this._disabledUntil = specifiedTimeToday;
        } else {
            this._disabledUntil = specifiedTimeToday.add(1, "days");
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
            // don't pass this._disabledUntil in a way that lets the caller mutate it
            return moment(this._disabledUntil);
        } else {
            return undefined;
        }
    }

    getReason() {
        return this._reason;
    }
}

module.exports = DisabledState;
