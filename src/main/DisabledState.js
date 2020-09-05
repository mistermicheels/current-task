/** @typedef { import("./windows/DialogWindowService") } DialogWindowService */
/** @typedef { import("./Logger") } Logger */

const moment = require("moment");

const DateTimeHelper = require("./DateTimeHelper");

class DisabledState {
    /**
     * @param {boolean} requireReasonForDisabling
     * @param {DialogWindowService} dialogWindowService
     * @param {Logger} logger
     */
    constructor(requireReasonForDisabling, dialogWindowService, logger) {
        this._disabledUntil = undefined;
        this._reason = undefined;

        this._dateTimeHelper = new DateTimeHelper();
        this._requireReasonForDisabling = requireReasonForDisabling;
        this._dialogWindowService = dialogWindowService;
        this._logger = logger;
    }

    /** @param {moment.Moment} now */
    update(now) {
        if (this._disabledUntil && !this._disabledUntil.isAfter(now)) {
            this._enableAppInternal();
            this._logger.info(`Disabled period expired`);
        }
    }

    _enableAppInternal() {
        this._disabledUntil = undefined;
        this._reason = undefined;
    }

    /**
     * @param {number} minutes
     * @param {moment.Moment} now
     */
    disableAppForMinutes(minutes, now) {
        this._disabledUntil = moment(now).add(minutes, "minutes");
        this._logger.info(`Disabled app for ${minutes} minutes`);
    }

    /**
     * @param {moment.Moment} now
     */
    async disableAppUntilSpecificTime(now) {
        const disableDialogResult = await this._getDisableDialogResult();

        if (!disableDialogResult) {
            return;
        }

        const timeString = disableDialogResult.disableUntil;
        const nextOccurrenceOfTime = this._dateTimeHelper.getNextOccurrenceOfTime(timeString, now);
        const differenceHours = nextOccurrenceOfTime.diff(now, "hours");

        if (differenceHours >= 2) {
            const confirmResult = await this._getDisableConfirmDialogResult(differenceHours);

            if (!confirmResult) {
                return;
            }
        }

        this._disabledUntil = nextOccurrenceOfTime;
        this._reason = disableDialogResult.reason;
        this._logger.info(`Disabled app until ${this._disabledUntil.format()}`);
    }

    /** @returns {Promise<{ disableUntil: string, reason?: string }>} */
    _getDisableDialogResult() {
        return this._dialogWindowService.openDialogAndGetResult({
            fields: [
                {
                    type: "text",
                    name: "disableUntil",
                    label: "Disable until",
                    placeholder: "HH:mm",
                    required: true,
                    pattern: "([0-1][0-9]|2[0-3]):[0-5][0-9]",
                },
                {
                    type: "text",
                    name: "reason",
                    label: "Reason",
                    placeholder: "The reason for disabling",
                    required: this._requireReasonForDisabling,
                },
            ],
            submitButtonName: "Disable",
        });
    }

    _getDisableConfirmDialogResult(differenceHours) {
        return this._dialogWindowService.openDialogAndGetResult({
            message: `You are about to disable the app for more than ${differenceHours} hours, are you sure?`,
            submitButtonName: "Disable",
        });
    }

    enableApp() {
        this._enableAppInternal();
        this._logger.info("Manually enabled app");
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
