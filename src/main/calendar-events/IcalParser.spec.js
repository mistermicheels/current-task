const dedent = require("dedent");

const IcalParser = require("./IcalParser");

const icalParser = new IcalParser();

describe("IcalParser", () => {
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

        expect(icalParser.getCalendarEventsFromIcalData(icalData)).toEqual([
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

        expect(icalParser.getCalendarEventsFromIcalData(icalData)).toEqual([
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

        expect(icalParser.getCalendarEventsFromIcalData(icalData)).toEqual([
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

        expect(icalParser.getCalendarEventsFromIcalData(icalData)).toEqual([
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

        expect(icalParser.getCalendarEventsFromIcalData(icalData)).toEqual([
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

        expect(icalParser.getCalendarEventsFromIcalData(icalData)).toEqual([
            {
                summary: "Event without end specified",
                location: "Test location",
                start: new Date("2022-11-10T22:15:00Z"),
                end: new Date("2022-11-10T22:15:00Z"),
            },
        ]);
    });
});
