const dedent = require("dedent");
const moment = require("moment");

const IcalParser = require("./IcalParser");

const icalParser = new IcalParser();

const now = moment("2022-11-12T16:00:00Z");

describe("IcalParser", () => {
    it("handles recurring events with end date, excluded dates and specific occurrences", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VTIMEZONE
            TZID:Romance Standard Time
            BEGIN:STANDARD
            DTSTART:16010101T030000
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010101T020000
            TZOFFSETFROM:+0100
            TZOFFSETTO:+0200
            RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3
            END:DAYLIGHT
            END:VTIMEZONE
            BEGIN:VEVENT
            RRULE:FREQ=WEEKLY;UNTIL=20220927T090000Z;INTERVAL=1;BYDAY=TU,WE,TH,FR;WKST=
             SU
            EXDATE;TZID=Romance Standard Time:20220921T110000,20220923T110000
            UID:040000008200E00074C5B7101A82E00800000000201F13C5F441D801000000000000000
             010000000E80BBFCBB3399B4D81CED8B0C09007F8
            SUMMARY:Recurring event
            DTSTART;TZID=Romance Standard Time:20220916T110000
            DTEND;TZID=Romance Standard Time:20220916T113000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            UID:040000008200E00074C5B7101A82E00800000000201F13C5F441D801000000000000000
             010000000E80BBFCBB3399B4D81CED8B0C09007F8
            RECURRENCE-ID;TZID=Romance Standard Time:20220920T110000
            SUMMARY:Recurring event
            DTSTART;TZID=Romance Standard Time:20220920T103000
            DTEND;TZID=Romance Standard Time:20220920T110000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            UID:040000008200E00074C5B7101A82E00800000000201F13C5F441D801000000000000000
             010000000E80BBFCBB3399B4D81CED8B0C09007F8
            RECURRENCE-ID;TZID=Romance Standard Time:20220922T110000
            SUMMARY:Recurring event
            DTSTART;TZID=Romance Standard Time:20220922T090000
            DTEND;TZID=Romance Standard Time:20220922T093000
            LOCATION:Test location
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "Recurring event",
                location: "Test location",
                start: new Date("2022-09-16T09:00:00Z"),
                end: new Date("2022-09-16T09:30:00Z"),
            },
            {
                summary: "Recurring event",
                location: "Test location",
                start: new Date("2022-09-20T08:30:00Z"),
                end: new Date("2022-09-20T09:00:00Z"),
            },
            {
                summary: "Recurring event",
                location: "Test location",
                start: new Date("2022-09-22T07:00:00Z"),
                end: new Date("2022-09-22T07:30:00Z"),
            },
            {
                summary: "Recurring event",
                location: "Test location",
                start: new Date("2022-09-27T09:00:00Z"),
                end: new Date("2022-09-27T09:30:00Z"),
            },
        ]);
    });

    it("handles recurring events without specified end date", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VTIMEZONE
            TZID:Europe/Brussels
            BEGIN:DAYLIGHT
            TZOFFSETFROM:+0100
            TZOFFSETTO:+0200
            TZNAME:CEST
            DTSTART:19700329T020000
            RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
            END:DAYLIGHT
            BEGIN:STANDARD
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            TZNAME:CET
            DTSTART:19701025T030000
            RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
            END:STANDARD
            END:VTIMEZONE
            BEGIN:VEVENT
            DTSTART;TZID=Europe/Brussels:20221104T200000
            DTEND;TZID=Europe/Brussels:20221104T223000
            RRULE:FREQ=WEEKLY
            LOCATION:Test location
            SUMMARY:Recurring forever
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "Recurring forever",
                location: "Test location",
                start: new Date("2022-11-04T19:00:00Z"),
                end: new Date("2022-11-04T21:30:00Z"),
            },
            {
                summary: "Recurring forever",
                location: "Test location",
                start: new Date("2022-11-11T19:00:00Z"),
                end: new Date("2022-11-11T21:30:00Z"),
            },
        ]);
    });

    it("handles recurring events crossing a DST boundary", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VTIMEZONE
            TZID:Europe/Brussels
            BEGIN:DAYLIGHT
            TZOFFSETFROM:+0100
            TZOFFSETTO:+0200
            TZNAME:CEST
            DTSTART:19700329T020000
            RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
            END:DAYLIGHT
            BEGIN:STANDARD
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            TZNAME:CET
            DTSTART:19701025T030000
            RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
            END:STANDARD
            END:VTIMEZONE
            BEGIN:VEVENT
            DTSTART;TZID=Europe/Brussels:20221028T200000
            DTEND;TZID=Europe/Brussels:20221028T223000
            RRULE:FREQ=WEEKLY;UNTIL=20221104T190000Z
            LOCATION:Test location
            SUMMARY:Recurring event
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "Recurring event",
                location: "Test location",
                start: new Date("2022-10-28T18:00:00Z"),
                end: new Date("2022-10-28T20:30:00Z"),
            },
            {
                summary: "Recurring event",
                location: "Test location",
                start: new Date("2022-11-04T19:00:00Z"),
                end: new Date("2022-11-04T21:30:00Z"),
            },
        ]);
    });

    it("handles all-day events based on local time", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VEVENT
            DTSTART;VALUE=DATE:20220815
            DTEND;VALUE=DATE:20220816
            LOCATION:Test location
            SUMMARY:All-day event
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "All-day event",
                location: "Test location",
                start: new Date("2022-08-15T00:00:00"),
                end: new Date("2022-08-16T00:00:00"),
            },
        ]);
    });

    it("handles recurring all-day events", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VEVENT
            DTSTART;VALUE=DATE:20221104
            DTEND;VALUE=DATE:20221105
            RRULE:FREQ=WEEKLY;UNTIL=20221117;BYDAY=FR
            LOCATION:Test location
            SUMMARY:All-day event
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "All-day event",
                location: "Test location",
                start: new Date("2022-11-04T00:00:00"),
                end: new Date("2022-11-05T00:00:00"),
            },
            {
                summary: "All-day event",
                location: "Test location",
                start: new Date("2022-11-11T00:00:00"),
                end: new Date("2022-11-12T00:00:00"),
            },
        ]);
    });

    it("handles events specified in UTC time", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VEVENT
            DTSTART:20221110T221500Z
            DTEND:20221110T233000Z
            LOCATION:Test location
            SUMMARY:UTC event
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "UTC event",
                location: "Test location",
                start: new Date("2022-11-10T22:15:00Z"),
                end: new Date("2022-11-10T23:30:00Z"),
            },
        ]);
    });

    it("handles events using IANA timezone IDs", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VTIMEZONE
            TZID:Asia/Calcutta
            BEGIN:STANDARD
            DTSTART:16010101T000000
            TZOFFSETFROM:+0530
            TZOFFSETTO:+0530
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010101T000000
            TZOFFSETFROM:+0530
            TZOFFSETTO:+0530
            END:DAYLIGHT            
            END:VTIMEZONE
            BEGIN:VTIMEZONE
            TZID:Europe/Brussels
            BEGIN:STANDARD
            DTSTART:16010101T030000
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010101T020000
            TZOFFSETFROM:+0100
            TZOFFSETTO:+0200
            RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3
            END:DAYLIGHT
            END:VTIMEZONE
            BEGIN:VEVENT
            SUMMARY:India Event
            DTSTART;TZID=Asia/Calcutta:20220920T183000
            DTEND;TZID=Asia/Calcutta:20220920T193000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            SUMMARY:Belgium DST event
            DTSTART;TZID=Europe/Brussels:20220920T183000
            DTEND;TZID=Europe/Brussels:20220920T193000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            SUMMARY:Belgium non-DST event
            DTSTART;TZID=Europe/Brussels:20221030T183000
            DTEND;TZID=Europe/Brussels:20221030T193000
            LOCATION:Test location
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "India Event",
                location: "Test location",
                start: new Date("2022-09-20T13:00:00Z"),
                end: new Date("2022-09-20T14:00:00Z"),
            },
            {
                summary: "Belgium DST event",
                location: "Test location",
                start: new Date("2022-09-20T16:30:00Z"),
                end: new Date("2022-09-20T17:30:00Z"),
            },
            {
                summary: "Belgium non-DST event",
                location: "Test location",
                start: new Date("2022-10-30T17:30:00Z"),
                end: new Date("2022-10-30T18:30:00Z"),
            },
        ]);
    });

    it("handles events using global IANA timezone IDs", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VEVENT
            SUMMARY:India Event
            DTSTART;TZID=/Asia/Calcutta:20220920T183000
            DTEND;TZID=/Asia/Calcutta:20220920T193000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            SUMMARY:Belgium DST event
            DTSTART;TZID=/Europe/Brussels:20220920T183000
            DTEND;TZID=/Europe/Brussels:20220920T193000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            SUMMARY:Belgium non-DST event
            DTSTART;TZID=/Europe/Brussels:20221030T183000
            DTEND;TZID=/Europe/Brussels:20221030T193000
            LOCATION:Test location
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "India Event",
                location: "Test location",
                start: new Date("2022-09-20T13:00:00Z"),
                end: new Date("2022-09-20T14:00:00Z"),
            },
            {
                summary: "Belgium DST event",
                location: "Test location",
                start: new Date("2022-09-20T16:30:00Z"),
                end: new Date("2022-09-20T17:30:00Z"),
            },
            {
                summary: "Belgium non-DST event",
                location: "Test location",
                start: new Date("2022-10-30T17:30:00Z"),
                end: new Date("2022-10-30T18:30:00Z"),
            },
        ]);
    });

    it("handles events using Windows-style timezone IDs", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VTIMEZONE
            TZID:India Standard Time
            BEGIN:STANDARD
            DTSTART:16010101T000000
            TZOFFSETFROM:+0530
            TZOFFSETTO:+0530
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010101T000000
            TZOFFSETFROM:+0530
            TZOFFSETTO:+0530
            END:DAYLIGHT            
            END:VTIMEZONE
            BEGIN:VTIMEZONE
            TZID:Romance Standard Time
            BEGIN:STANDARD
            DTSTART:16010101T030000
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010101T020000
            TZOFFSETFROM:+0100
            TZOFFSETTO:+0200
            RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3
            END:DAYLIGHT
            END:VTIMEZONE
            BEGIN:VEVENT
            SUMMARY:India Event
            DTSTART;TZID=India Standard Time:20220920T183000
            DTEND;TZID=India Standard Time:20220920T193000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            SUMMARY:Belgium DST event
            DTSTART;TZID=Romance Standard Time:20220920T183000
            DTEND;TZID=Romance Standard Time:20220920T193000
            LOCATION:Test location
            END:VEVENT
            BEGIN:VEVENT
            SUMMARY:Belgium non-DST event
            DTSTART;TZID=Romance Standard Time:20221030T183000
            DTEND;TZID=Romance Standard Time:20221030T193000
            LOCATION:Test location
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "India Event",
                location: "Test location",
                start: new Date("2022-09-20T13:00:00Z"),
                end: new Date("2022-09-20T14:00:00Z"),
            },
            {
                summary: "Belgium DST event",
                location: "Test location",
                start: new Date("2022-09-20T16:30:00Z"),
                end: new Date("2022-09-20T17:30:00Z"),
            },
            {
                summary: "Belgium non-DST event",
                location: "Test location",
                start: new Date("2022-10-30T17:30:00Z"),
                end: new Date("2022-10-30T18:30:00Z"),
            },
        ]);
    });

    it("handles events using custom timezone IDs by assuming the event is in the server's timezone", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VTIMEZONE
            TZID:Custom timezone ID
            BEGIN:STANDARD
            DTSTART:16010101T000000
            TZOFFSETFROM:+0530
            TZOFFSETTO:+0530
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010101T000000
            TZOFFSETFROM:+0530
            TZOFFSETTO:+0530
            END:DAYLIGHT            
            END:VTIMEZONE
            BEGIN:VEVENT
            SUMMARY:Custom timezone event
            DTSTART;TZID=Custom timezone ID:20220920T183000
            DTEND;TZID=Custom timezone ID:20220920T193000
            LOCATION:Test location
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "Custom timezone event",
                location: "Test location",
                start: new Date("2022-09-20T18:30:00"),
                end: new Date("2022-09-20T19:30:00"),
            },
        ]);
    });

    it("sets event end time to event start time if end time is missing from the iCal data", () => {
        const icalData = dedent(
            `BEGIN:VCALENDAR
            BEGIN:VEVENT
            DTSTART:20221110T221500Z
            LOCATION:Test location
            SUMMARY:Event without end specified
            END:VEVENT
            END:VCALENDAR`
        );

        expect(icalParser.getCalendarEventsFromIcalData(icalData, now)).toEqual([
            {
                summary: "Event without end specified",
                location: "Test location",
                start: new Date("2022-11-10T22:15:00Z"),
                end: new Date("2022-11-10T22:15:00Z"),
            },
        ]);
    });
});
