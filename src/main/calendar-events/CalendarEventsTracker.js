/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalendarEvent").CalendarEvent } CalendarEvent */

const axios = require("axios").default;
const moment = require("moment");

const IcalParser = require("./IcalParser");

const CALENDAR_REFRESH_INTERVAL = 60000;
const CALENDAR_REFRESH_TIMEOUT = 30000;

class CalendarEventsTracker {
    /**
     * @param {string} calendarUrl
     * @param {Logger} logger
     */
    constructor(calendarUrl, logger) {
        this._calendarUrl = calendarUrl;
        this._logger = logger;

        this._icalParser = new IcalParser();

        this._isRefreshInProgress = false;

        /** @type {CalendarEvent[]} */
        this._calendarEvents = [];

        this._calendarErrorMessage = undefined;

        setInterval(() => this.refreshFromCalendar(moment()), CALENDAR_REFRESH_INTERVAL);
    }

    /** @param {string} calendarUrl */
    updateCalendarUrl(calendarUrl) {
        this._calendarUrl = calendarUrl;
    }

    /**
     * Note: this is called periodically but can also be triggered separately
     * @param {moment.Moment} now
     */
    async refreshFromCalendar(now) {
        if (!this._calendarUrl) {
            this._calendarEvents = [];
            this._calendarErrorMessage = undefined;
            return;
        }

        if (this._isRefreshInProgress) {
            this._logger.debugIntegration("Calendar refresh still in progress");
            return;
        }

        try {
            this._isRefreshInProgress = true;
            this._logger.debugIntegration(`Retrieving calendar data from URL ${this._calendarUrl}`);
            const response = await axios(this._calendarUrl, { timeout: CALENDAR_REFRESH_TIMEOUT });
            this._logger.debugIntegration(`Retrieved calendar data from URL ${this._calendarUrl}`);
            const icalData = response.data;
            this._calendarEvents = this._icalParser.getCalendarEventsFromIcalData(icalData, now);
            this._calendarErrorMessage = undefined;
        } catch (error) {
            this._calendarEvents = undefined;
            this._calendarErrorMessage = "Problem getting calendar data";
            this._logger.error(`Unable to retrieve calendar data from URL ${this._calendarUrl}`);
        } finally {
            this._isRefreshInProgress = false;
        }
    }

    /**
     * @param {moment.Moment} now
     * @returns {CalendarEvent[]}
     */
    getActiveCalendarEvents(now) {
        if (!this._calendarEvents) {
            return [];
        }

        return this._calendarEvents.filter((event) => now.isBetween(event.start, event.end));
    }

    getCalendarErrorMessage() {
        return this._calendarErrorMessage;
    }
}

module.exports = CalendarEventsTracker;
