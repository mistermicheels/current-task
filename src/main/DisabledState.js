/** @typedef { import("./windows/DialogWindowService") } DialogWindowService */
/** @typedef { import("./Logger") } Logger */

const moment = require("moment");

const DateTimeHelper = require("./util/DateTimeHelper");

const DISABLED_HOURS_CONFIRMATION_THRESHOLD = 2;

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

    /** @param {boolean} requireReasonForDisabling */
    updateRequireReasonForDisabling(requireReasonForDisabling) {
        this._requireReasonForDisabling = requireReasonForDisabling;
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
        this._reason = undefined;
        this._logger.info(`Disabled app for ${minutes} minutes`);
    }

    async disableAppUntilSpecificTime() {
        let endTimeString;
        let endTimeMoment;
        let reason;
        let isEndTimeValidated = false;

        while (!isEndTimeValidated) {
            const disableDialogResult = await this._getDisableDialogResult(endTimeString, reason);

            if (!disableDialogResult) {
                return; // cancelled by user
            }

            const now = moment();
            endTimeString = disableDialogResult.disableUntil;
            endTimeMoment = this._dateTimeHelper.getNextOccurrenceOfTime(endTimeString, now);
            reason = disableDialogResult.reason;
            isEndTimeValidated = await this._isAllowedEndTimeForDisable(endTimeMoment, now);
        }

        this._disabledUntil = endTimeMoment;
        this._reason = reason;
        this._logger.info(`Disabled app until ${this._disabledUntil.format()}`);
    }

    /**
     * @param {moment.Moment} endTime
     * @param {moment.Moment} now
     * @returns {Promise<boolean>}
     */
    async _isAllowedEndTimeForDisable(endTime, now) {
        const differenceHours = endTime.diff(now, "hours");

        if (differenceHours >= DISABLED_HOURS_CONFIRMATION_THRESHOLD) {
            const confirmationResult = await this._getDisableConfirmDialogResult(differenceHours);
            return !!confirmationResult;
        } else {
            return true;
        }
    }

    /**
     * @param {string} [currentDisableUntil]
     * @param {string} [currentReason]
     * @returns {Promise<{ disableUntil: string, reason?: string }>}
     */
    _getDisableDialogResult(currentDisableUntil, currentReason) {
        return this._dialogWindowService.openDialogAndGetResult({
            fields: [
                {
                    type: "text",
                    name: "disableUntil",
                    label: "Disable until",
                    placeholder: "HH:mm",
                    required: true,
                    pattern: "([0-1][0-9]|2[0-3]):[0-5][0-9]",
                    currentValue: currentDisableUntil,
                },
                {
                    type: "text",
                    name: "reason",
                    label: "Reason",
                    placeholder: "The reason for disabling",
                    required: this._requireReasonForDisabling,
                    currentValue: currentReason,
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
