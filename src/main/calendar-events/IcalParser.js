/** @typedef {Date & { tz?: string, dateOnly?: boolean }} ParsedDate The 'ical' package puts timezone info in a 'tz' property */
/** @typedef {ical.CalendarComponent & { start?: ParsedDate, end?: ParsedDate }} CalendarComponent */
/** @typedef { import("./CalendarEvent").CalendarEvent } CalendarEvent */

const ical = require("ical");
const { RRule } = require("rrule");

// when timezone rules change, we likely need to update these packages
const windowsZonesData = require("cldr-core/supplemental/windowsZones.json");
const moment = require("moment");
const momentTimezone = require("moment-timezone");

const ianaTimezonesForWindowsZones = new Map(
    windowsZonesData.supplemental.windowsZones.mapTimezones.map((mapTimezone) => [
        mapTimezone.mapZone._other, // Windows timezone ID
        mapTimezone.mapZone._type.split(" ")[0], // first matching IANA timezone ID
    ])
);

const momentTimezoneKnownTimezones = new Set(momentTimezone.tz.names());

const EVENT_WITH_LINE_BREAK_REGEX = /^BEGIN:VEVENT.*?^END:VEVENT\r?\n/gms;
const RECURRENCE_RULE_REGEX = /^RRULE:/gm;

class IcalParser {
    /**
     * @param {string} icalData
     * @param {moment.Moment} now The current local server time
     * @returns {CalendarEvent[]}
     */
    getCalendarEventsFromIcalData(icalData, now) {
        const adjustedIcalData = this._raiseEventsWithRecurrenceRuleToTop(icalData);

        const parsedIcalEntries = Object.values(ical.parseICS(adjustedIcalData));

        const events = parsedIcalEntries
            .filter((entry) => entry.type === "VEVENT")
            .flatMap((event) => this._getRelevantOccurrences(event, now))
            .map((event) => this._fixStartAndEndTime(event));

        return events.map((event) => ({
            summary: event.summary,
            location: event.location,
            start: event.start,
            end: event.end,
            isAllDay: !!event.start.dateOnly,
        }));
    }

    /**
     * Raising events with an RRULE to the top makes 'ical' handle some cases better.
     * Otherwise, it might miss the recurrence rule completely.
     * @param {string} icalData
     */
    _raiseEventsWithRecurrenceRuleToTop(icalData) {
        let firstEventStartIndex;
        let lastEventEndIndex;

        const eventsWithRecurrenceRule = [];
        const eventsWithoutRecurrenceRule = [];

        for (const eventRegexMatch of icalData.matchAll(EVENT_WITH_LINE_BREAK_REGEX)) {
            if (!firstEventStartIndex) {
                firstEventStartIndex = eventRegexMatch.index;
            }

            const matchedText = eventRegexMatch[0];
            lastEventEndIndex = eventRegexMatch.index + matchedText.length;

            if (RECURRENCE_RULE_REGEX.test(matchedText)) {
                eventsWithRecurrenceRule.push(matchedText);
            } else {
                eventsWithoutRecurrenceRule.push(matchedText);
            }
        }

        return (
            icalData.substring(0, firstEventStartIndex) +
            eventsWithRecurrenceRule.join("") +
            eventsWithoutRecurrenceRule.join("") +
            icalData.substring(lastEventEndIndex)
        );
    }

    /**
     * @param {CalendarComponent} event
     * @param {moment.Moment} now
     * @returns {CalendarComponent[]}
     */
    _getRelevantOccurrences(event, now) {
        if (!event.rrule) {
            // event is not recurring, just return the event as is
            return [event];
        }

        const correctedRecurrenceRule = this._getCorrectedRecurrenceRule(event);

        // start from beginning so we don't miss occurrences that already started and are still ongoing
        const ruleOccurrencesUntilNow = correctedRecurrenceRule
            .between(
                // 'ical' uses local times expressed in server time, 'rrule' uses local times as UTC time
                moment(event.start).utc(true).toDate(),
                // we care about events that are happening right now (or will start before next refresh)
                // events have not yet been adjusted for the correct time zone, so we need to add a buffer
                // an occurrence that is after "now" might be before "now" after timezone adjustment
                moment(now).add(1, "days").utc(true).toDate(),
                true
            )
            // convert back from local times as UTC time to local times expressed in server time
            .map((occurrence) => moment.utc(occurrence).local(true).toDate());

        /** @type {CalendarComponent[]} */
        const eventOccurrencesUntilNow = [];

        for (const ruleOccurrence of ruleOccurrencesUntilNow) {
            // 'ical' indexes exdate/recurrences by date after converting 'local time as server time' to UTC
            const dateString = moment(ruleOccurrence).utc().format("YYYY-MM-DD");

            // "exdate" holds dates when the recurrence does not apply
            const isExcluded = event.exdate && event.exdate[dateString];
            // "recurrences" holds occurrences which deviate from the parent event in some way
            // we add these separately below
            const isDeviatingFromParent = event.recurrences && event.recurrences[dateString];

            if (!isExcluded && !isDeviatingFromParent) {
                eventOccurrencesUntilNow.push(this._getEventOccurrence(event, ruleOccurrence));
            }
        }

        // 'ical' indexes exdate/recurrences by date after converting 'local time as server time' to UTC
        const eventStartDateString = moment(event.start).utc().format("YYYY-MM-DD");

        // add occurrences deviating from parent event
        for (const dateString in event.recurrences) {
            // ignore recurrences from before event start date (workaround strange Outlook behavior)
            if (dateString >= eventStartDateString) {
                eventOccurrencesUntilNow.push(event.recurrences[dateString]);
            }
        }

        return eventOccurrencesUntilNow;
    }

    /**
     * @param {CalendarComponent} event Event as obtained from 'ical' (no timezone adjustment performed)
     * @returns {RRule}
     */
    _getCorrectedRecurrenceRule(event) {
        // at this point, no timezone adjustment has been performed yet
        // start and end times for events are local times expressed in local server time
        // 'rrule' follows a convention of representing local times as UTC times
        // however, 'ical' just calls toISOString() on event.start when creating the RRule object
        // this means the time in UTC time may not be the correct local time
        // therefore, we first have to fix the rule

        const rruleString = event.rrule.toString();
        const properStartDate = moment(event.start).format("YYYYMMDDTHHmmss");
        let properRuleString = rruleString.replace(/DTSTART=\w+/, `DTSTART=${properStartDate}`);

        const isAllDayEvent = !!event.start["dateOnly"];
        const untilDateMatch = rruleString.match(/UNTIL=(\w+)/);

        if (!isAllDayEvent && untilDateMatch) {
            const untilDate = untilDateMatch[1]; // until date in UTC (ending in 'Z') from in iCal data
            const ianaTimezoneId = this._getIanaTimezoneId(event.start.tz);
            let untilDateInEventTimezone;

            if (ianaTimezoneId) {
                untilDateInEventTimezone = momentTimezone(untilDate).tz(ianaTimezoneId);
            } else {
                // the best we can do is assume server timezone matches event timezone
                untilDateInEventTimezone = moment(untilDate).local();
            }

            // transform until date to local time represented as UTC time as per 'rrule' convention
            const properUntilDate = untilDateInEventTimezone.utc(true).format("YYYYMMDDTHHmmss");

            properRuleString = properRuleString.replace(/UNTIL=\w+/, `UNTIL=${properUntilDate}`);
        }

        return RRule.fromString(properRuleString);
    }

    /**
     * @param {CalendarComponent} event
     * @param {Date} occurrence
     * @returns {CalendarComponent}
     */
    _getEventOccurrence(event, occurrence) {
        const daysSinceFirstStart = moment(occurrence).diff(event.start, "days");
        const eventCopy = { ...event };
        const start = moment(event.start).add(daysSinceFirstStart, "days").toDate();
        const end = moment(event.end).add(daysSinceFirstStart, "days").toDate();
        eventCopy.start = this._adjustParsedDate(event.start, start, { keepTzProperty: true });
        eventCopy.end = this._adjustParsedDate(event.end, end, { keepTzProperty: true });
        return eventCopy;
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
     * @returns {ParsedDate}
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
        const adjustedDate = momentTimezone(parsedDate).tz(ianaTimezoneId, true).toDate();

        return this._adjustParsedDate(parsedDate, adjustedDate, { keepTzProperty: false });
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

    /**
     * @param {ParsedDate} originalParsedDate
     * @param {Date} newDate
     * @param {{ keepTzProperty: boolean }} options
     * @returns {ParsedDate}
     */
    _adjustParsedDate(originalParsedDate, newDate, { keepTzProperty }) {
        /** @type {ParsedDate} */
        const adjustedParsedDate = new Date(newDate);

        adjustedParsedDate.dateOnly = !!originalParsedDate.dateOnly;

        if (keepTzProperty) {
            adjustedParsedDate.tz = originalParsedDate.tz;
        }

        return adjustedParsedDate;
    }
}

module.exports = IcalParser;
