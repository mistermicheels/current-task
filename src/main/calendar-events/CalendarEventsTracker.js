/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./CalendarEvent").CalendarEvent } CalendarEvent */
/** @typedef { import("./CalendarEvent").CalendarEventWithCalendarName } CalendarEventWithCalendarName */
/** @typedef {{ url: string, isRefreshInProgress: boolean, events?: CalendarEvent[] }} CalendarData */

const axios = require("axios").default;
const moment = require("moment");

const IcalParser = require("./IcalParser");

const CALENDAR_REFRESH_INTERVAL = 60000;
const CALENDAR_REFRESH_TIMEOUT = 30000;

class CalendarEventsTracker {
    /**
     * @param {{ [name: string]: string }} calendarUrls
     * @param {Logger} logger
     */
    constructor(calendarUrls, logger) {
        this._logger = logger;

        this._icalParser = new IcalParser();

        /** @type {Map<string, CalendarData>}  */
        this._calendarDataByCalendarName = new Map();

        this.updateCalendarUrls(calendarUrls);
        setInterval(() => this.refreshFromCalendars(moment()), CALENDAR_REFRESH_INTERVAL);
    }

    /**
     * @param {{ [name: string]: string }} calendarUrls
     */
    updateCalendarUrls(calendarUrls) {
        for (const calendarName in calendarUrls) {
            const newCalendarUrl = calendarUrls[calendarName];
            const existingCalendarData = this._calendarDataByCalendarName.get(calendarName);

            if (!existingCalendarData || existingCalendarData.url !== newCalendarUrl) {
                this._calendarDataByCalendarName.set(calendarName, {
                    url: newCalendarUrl,
                    isRefreshInProgress: false,
                    events: [],
                });
            }
        }

        for (const [calendarName] of this._calendarDataByCalendarName) {
            if (!(calendarName in calendarUrls)) {
                this._calendarDataByCalendarName.delete(calendarName);
            }
        }

        this.refreshFromCalendars(moment());
    }

    /**
     * Note: this is called periodically but can also be triggered separately
     * @param {moment.Moment} now
     */
    async refreshFromCalendars(now) {
        for (const [calendarName] of this._calendarDataByCalendarName) {
            this._refreshSingleCalendar(calendarName, now);
        }
    }

    /**
     * @param {string} calendarName
     * @param {moment.Moment} now
     */
    async _refreshSingleCalendar(calendarName, now) {
        const calendarData = this._calendarDataByCalendarName.get(calendarName);

        if (calendarData.isRefreshInProgress) {
            this._logger.debugIntegration(
                `Calendar refresh for calendar ${calendarName} still in progress`
            );

            return;
        }

        try {
            calendarData.isRefreshInProgress = true;
            this._logger.debugIntegration(`Retrieving calendar data from URL ${calendarData.url}`);
            const response = await axios(calendarData.url, { timeout: CALENDAR_REFRESH_TIMEOUT });
            this._logger.debugIntegration(`Retrieved calendar data from URL ${calendarData.url}`);
            const icalData = response.data;
            calendarData.events = this._icalParser.getCalendarEventsFromIcalData(icalData, now);
        } catch (error) {
            calendarData.events = undefined;
            this._logger.error(`Unable to retrieve calendar data from URL ${calendarData.url}`);
        } finally {
            calendarData.isRefreshInProgress = false;
        }
    }

    /**
     * @param {moment.Moment} now
     * @returns {CalendarEventWithCalendarName[]}
     */
    getActiveCalendarEvents(now) {
        /** @type {CalendarEventWithCalendarName[]} */
        const activeEvents = [];

        for (const [calendarName, calendarData] of this._calendarDataByCalendarName) {
            if (calendarData.events) {
                activeEvents.push(
                    ...calendarData.events
                        .filter((event) => now.isBetween(event.start, event.end))
                        .map((event) => ({ ...event, calendar: calendarName }))
                );
            }
        }

        return activeEvents;
    }

    getCalendarErrorMessage() {
        for (const [calendarName, calendarData] of this._calendarDataByCalendarName) {
            if (!calendarData.events) {
                return `Problem getting calendar data for calendar ${calendarName}`;
            }
        }

        return undefined;
    }
}

module.exports = CalendarEventsTracker;
