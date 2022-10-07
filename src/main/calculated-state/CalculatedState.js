/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../calendar-events/CalendarEvent").CalendarEvent } CalendarEvent */
/** @typedef { import("../configuration/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../configuration/AdvancedConfiguration").CustomStateRule } CustomStateRule */
/** @typedef { import("../configuration/Condition").Condition } Condition */
/** @typedef { import("../configuration/Status").Status } Status */
/** @typedef { import("../tasks/TasksSummary").TasksSummary } TasksSummary */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalculatedStateSnapshot").CalculatedStateSnapshot } CalculatedStateSnapshot */
/** @typedef { import("./WindowState").WindowState } WindowState */

const ConditionMatcher = require("./ConditionMatcher");
const CustomStateCalculator = require("./CustomStateCalculator");
const StatusTimerData = require("./StatusTimerData");
const WindowStateCalculator = require("./WindowStateCalculator");

class CalculatedState {
    /**
     * @param {AdvancedConfiguration} configuration
     * @param {Logger} logger
     * r@param {Moment} now
     */
    constructor(configuration, logger, now) {
        this._configuration = configuration;
        this._logger = logger;

        this._conditionMatcher = new ConditionMatcher();
        this._statusTimerData = new StatusTimerData(now);
        this._customStateCalculator = new CustomStateCalculator(this._conditionMatcher);
        this._windowStateCalculator = new WindowStateCalculator(this._conditionMatcher);
    }

    /**
     * @param {AdvancedConfiguration} configuration
     */
    updateConfiguration(configuration) {
        this._configuration = configuration;
    }

    /** @param {Moment} now */
    resetStatusTimers(now) {
        this._statusTimerData.reset(now);
    }

    /**
     * @param {TasksSummary} tasksSummary
     * @param {CalendarEvent[]} activeEvents
     * @param {Moment} now
     */
    updateFromTasksSummaryAndActiveEvents(tasksSummary, activeEvents, now) {
        this._logger.debugStateCalculation(
            "Updating from tasks summary and active events:",
            tasksSummary,
            activeEvents
        );

        this._tasksSummary = tasksSummary;
        this._activeEvents = activeEvents;
        this._setStatusAndMessage("ok", this._getStandardMessage(tasksSummary));
        this._customStateShouldClearCurrent = false;
        this._updateDateTime(now);
        this._applyCustomStateRules();
        this._statusTimerData.updateFromCurrentStatus(this._status, now);
        this._applyDowntimeNaggingBlinkingConditions();
    }

    /**
     * @param {TasksSummary} tasksSummary
     * @param {string} errorMessage
     * @param {Moment} now
     */
    updateFromTasksOrEventsError(tasksSummary, errorMessage, now) {
        this._logger.debugStateCalculation(`Updating from tasks error: ${errorMessage}`);

        this._tasksSummary = tasksSummary;
        this._activeEvents = [];
        this._setStatusAndMessage("error", errorMessage);
        this._customStateShouldClearCurrent = false;
        this._updateDateTime(now);
        this._statusTimerData.updateFromCurrentStatus(this._status, now);
        this._applyDowntimeNaggingBlinkingConditions();
    }

    /**
     * @param {Status} status
     * @param {string} message
     */
    _setStatusAndMessage(status, message) {
        this._status = status;
        this._message = message;
    }

    /** @param {Moment} now */
    _updateDateTime(now) {
        this._dateTimeSummary = {
            dayOfWeek: now.day(),
            hours: now.hours(),
            minutes: now.minutes(),
            seconds: now.seconds(),
        };
    }

    /** @param {TasksSummary} tasksSummary */
    _getStandardMessage(tasksSummary) {
        if (tasksSummary.numberMarkedCurrent === 1) {
            return tasksSummary.currentTaskTitle;
        } else if (tasksSummary.numberMarkedCurrent === 0) {
            return "(no current task)";
        } else {
            return `(${tasksSummary.numberMarkedCurrent} tasks marked current)`;
        }
    }

    _applyCustomStateRules() {
        // custom state rules determine status and can therefore not be based on status (or related data)
        const snapshotWithStatusPlaceholders = this._getSnapshotWithStatusPlaceholders();

        const customState = this._customStateCalculator.calculateCustomState(
            snapshotWithStatusPlaceholders,
            this._configuration,
            this._logger
        );

        if (customState) {
            this._status = customState.status;
            this._message = customState.message;
            this._customStateShouldClearCurrent = customState.shouldClearCurrent;
        }
    }

    _applyDowntimeNaggingBlinkingConditions() {
        /** @type {WindowState} */
        this._windowState = this._windowStateCalculator.calculateWindowState(
            this.getSnapshot(),
            this._configuration,
            this._logger
        );
    }

    /**
     * @returns {CalculatedStateSnapshot}
     */
    getSnapshot() {
        return {
            ...this._tasksSummary,
            activeCalendarEvents: this._activeEvents,
            ...this._dateTimeSummary,
            status: this._status,
            message: this._message,
            secondsInCurrentStatus: this._statusTimerData.getSecondsInCurrentStatus(),
            secondsSinceOkStatus: this._statusTimerData.getSecondsSinceOkStatus(),
            ...this._windowState,
            customStateShouldClearCurrent: this._customStateShouldClearCurrent,
        };
    }

    /**
     * @returns {CalculatedStateSnapshot}
     */
    _getSnapshotWithStatusPlaceholders() {
        return {
            ...this.getSnapshot(),
            status: "ok",
            secondsInCurrentStatus: 0,
            secondsSinceOkStatus: 0,
        };
    }
}

module.exports = CalculatedState;
