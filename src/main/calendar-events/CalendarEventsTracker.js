/** @typedef { import("moment").Moment } Moment */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalendarEvent").CalendarEvent } CalendarEvent */

const axios = require("axios").default;
const ical = require("ical");

const CALENDAR_REFRESH_INTERVAL = 2000;
const CALENDAR_REFRESH_TIMEOUT = 30000;

class CalendarEventsTracker {
    /**
     * @param {string} calendarUrl
     * @param {Logger} logger
     */
    constructor(calendarUrl, logger) {
        this._calendarUrl = calendarUrl;
        this._logger = logger;

        this._isRefreshInProgress = false;

        this._calendarEvents = [];
        this._calendarErrorMessage = undefined;

        setInterval(() => this._refreshFromCalendar(), CALENDAR_REFRESH_INTERVAL);
    }

    /** @param {string} calendarUrl */
    updateCalendarUrl(calendarUrl) {
        this._calendarUrl = calendarUrl;
    }

    async _refreshFromCalendar() {
        if (!this._calendarUrl) {
            this._calendarEvents = [];
            this._calendarErrorMessage = undefined;
            return;
        }

        if (this._isRefreshInProgress) {
            this._logger.debugIntegration("Calendar refresh still in progress");
            return;
        }

        let icalData;

        try {
            this._isRefreshInProgress = true;
            this._logger.debugIntegration(`Retrieving calendar data from URL ${this._calendarUrl}`);
            const response = await axios(this._calendarUrl, { timeout: CALENDAR_REFRESH_TIMEOUT });
            this._logger.debugIntegration(`Retrieved calendar data from URL ${this._calendarUrl}`);
            icalData = response.data;
        } catch (error) {
            this._calendarEvents = undefined;
            this._calendarErrorMessage = "Problem getting calendar data";
            this._logger.error(`Unable to retrieve calendar data from URL ${this._calendarUrl}`);
            return;
        } finally {
            this._isRefreshInProgress = false;
        }

        const parsedIcalEntries = Object.values(ical.parseICS(icalData));
        this._calendarEvents = parsedIcalEntries.filter((entry) => entry.type === "VEVENT");
        this._calendarErrorMessage = undefined;
    }

    /**
     * @param {Moment} now
     * @returns {CalendarEvent[]}
     */
    getActiveCalendarEvents(now) {
        if (!this._calendarEvents) {
            return [];
        }

        return this._calendarEvents
            .filter((event) => now.isBetween(event.start, event.end))
            .map((event) => ({ summary: event.summary, location: event.location }));
    }

    getCalendarErrorMessage() {
        return this._calendarErrorMessage;
    }
}

module.exports = CalendarEventsTracker;
