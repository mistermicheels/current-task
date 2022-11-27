/** @typedef {Date & { tz?: string }} ParsedDate The 'ical' package puts timezone info in a 'tz' property */
/** @typedef {ical.CalendarComponent & { start?: ParsedDate, end?: ParsedDate }} CalendarComponent */
/** @typedef { import("./CalendarEvent").CalendarEvent } CalendarEvent */

const ical = require("ical");

// when timezone rules change, we likely need to update these packages
const windowsZonesData = require("cldr-core/supplemental/windowsZones.json");
const momentTimezone = require("moment-timezone");

const ianaTimezonesForWindowsZones = new Map(
    windowsZonesData.supplemental.windowsZones.mapTimezones.map((mapTimezone) => [
        mapTimezone.mapZone._other, // Windows timezone ID
        mapTimezone.mapZone._type.split(" ")[0], // first matching IANA timezone ID
    ])
);

const momentTimezoneKnownTimezones = new Set(momentTimezone.tz.names());

class IcalParser {
    /**
     * @param {string} icalData
     * @returns {CalendarEvent[]}
     */
    getCalendarEventsFromIcalData(icalData) {
        const parsedIcalEntries = Object.values(ical.parseICS(icalData));

        const events = parsedIcalEntries
            .filter((entry) => entry.type === "VEVENT")
            .map((event) => this._fixStartAndEndTime(event));

        return events.map((event) => ({
            summary: event.summary,
            location: event.location,
            start: event.start,
            end: event.end,
        }));
    }

    /**
     * For the start and end Date obtained from the 'ical' package, the time as expressed in local
     * server time is actually the local time in the event's timezone.
     * Therefore, the values are incorrect if the event was created in another timezone.
     * This function fixes that (used approach is not perfect but tends to work in practice).
     *
     * Additionally, for events without end specified, we set end = start.
     *
     * @param {CalendarComponent} event
     * @returns {CalendarComponent}
     */
    _fixStartAndEndTime(event) {
        const eventCopy = { ...event };
        eventCopy.start = this._applyTimezone(event.start);
        eventCopy.end = event.end ? this._applyTimezone(event.end) : eventCopy.start;
        return eventCopy;
    }

    /**
     * @param {ParsedDate} parsedDate This date, when expressed in local server time, should represent the
     * relevant local time in the provided timezone
     * @returns {Date}
     */
    _applyTimezone(parsedDate) {
        let icalTimezoneId = parsedDate.tz;

        if (!icalTimezoneId) {
            return parsedDate;
        }

        const ianaTimezoneId = this._getIanaTimezoneId(icalTimezoneId);

        if (!ianaTimezoneId) {
            // keep the date as is and hope the local server timezone matches the event's timezone
            return parsedDate;
        }

        // transform date to correct timezone while keeping local time
        return momentTimezone(parsedDate).tz(ianaTimezoneId, true).toDate();
    }

    /**
     * @param {string} icalTimezoneId
     * @returns {string}
     */
    _getIanaTimezoneId(icalTimezoneId) {
        // in principle, timezone IDs can be anything and don't mean anything by themselves
        // see also https://stackoverflow.com/questions/42919630/whats-vtimezone-used-for-in-icalendar-why-not-just-utc-time
        // in practice, we can often apply the correct timezone based on timezone ID alone

        // the alternative would be to parse the VTIMEZONE data, which can get very complex (see https://icalendar.org/iCalendar-RFC-5545/3-6-5-time-zone-component.html)
        // that would also require using the rrule package, which has some relevant performance problems

        let transformedTimezoneId = icalTimezoneId;

        // iCal supports global timezones starting with forward slash
        if (transformedTimezoneId.startsWith("/")) {
            return transformedTimezoneId.substring(1);
        }

        // Windows-style timezone IDs are being used in Outlook-generated iCal
        if (ianaTimezonesForWindowsZones.has(transformedTimezoneId)) {
            return ianaTimezonesForWindowsZones.get(transformedTimezoneId);
        }

        if (!momentTimezoneKnownTimezones.has(transformedTimezoneId)) {
            // we couldn't transform the timezone ID into an IANA timezone ID
            return undefined;
        }

        return transformedTimezoneId;
    }
}

module.exports = IcalParser;
