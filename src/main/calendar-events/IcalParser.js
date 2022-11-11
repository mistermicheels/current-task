/** @typedef { import("./CalendarEvent").CalendarEvent } CalendarEvent */

const ical = require("ical");

class IcalParser {
    /**
     * @param {string} icalData
     * @returns {CalendarEvent[]}
     */
    getCalendarEventsFromIcalData(icalData) {
        const parsedIcalEntries = Object.values(ical.parseICS(icalData));
        const calendarEvents = parsedIcalEntries.filter((entry) => entry.type === "VEVENT");

        return calendarEvents.map((event) => ({
            summary: event.summary,
            location: event.location,
            start: event.start,
            end: event.end,
        }));
    }
}

module.exports = IcalParser;
