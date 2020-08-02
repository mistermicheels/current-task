const moment = require("moment");

class DisabledState {
    constructor() {
        this._disabledUntil = undefined;
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
    disableForMinutes(minutes, now) {
        this._disabledUntil = moment(now).add(minutes, "m");
    }

    enable() {
        this._disabledUntil = undefined;
    }

    isAppDisabled() {
        return !!this._disabledUntil;
    }

    getDisabledUntil() {
        return this._disabledUntil.clone();
    }
}

module.exports = DisabledState;
