const moment = require("moment");

const DateTimeHelper = require("./DateTimeHelper");

const dateTimeHelper = new DateTimeHelper();

describe("DateTimeHelper", () => {
    describe("getNextOccurrenceOfTime", () => {
        it("allows specifying a time later today", () => {
            const timeString = "14:10";
            const now = moment("2020-08-10 14:05:10");
            const nextOccurrence = dateTimeHelper.getNextOccurrenceOfTime(timeString, now);

            expect(nextOccurrence.toDate()).toEqual(moment("2020-08-10 14:10:00").toDate());
        });

        it("allows specifying a time that crosses the day boundary", () => {
            const timeString = "14:00";
            const now = moment("2020-08-10 14:05:10");
            const nextOccurrence = dateTimeHelper.getNextOccurrenceOfTime(timeString, now);

            expect(nextOccurrence.toDate()).toEqual(moment("2020-08-11 14:00:00").toDate());
        });
    });

    describe("getSecondsSinceTimestampRounded", () => {
        it("returns zero if timestamp equals now", () => {
            const now = moment("2020-08-10 14:05:10");
            const timestamp = moment(now);
            const secondsRounded = dateTimeHelper.getSecondsSinceTimestampRounded(timestamp, now);
            expect(secondsRounded).toBe(0);
        });

        it("rounds up if applicable", () => {
            const now = moment("2020-08-10 14:05:10");
            const timestamp = moment("2020-08-10 14:05:05.111");
            const secondsRounded = dateTimeHelper.getSecondsSinceTimestampRounded(timestamp, now);
            expect(secondsRounded).toBe(5);
        });

        it("rounds down if applicable", () => {
            const now = moment("2020-08-10 14:05:10");
            const timestamp = moment("2020-08-10 14:05:05.777");
            const secondsRounded = dateTimeHelper.getSecondsSinceTimestampRounded(timestamp, now);
            expect(secondsRounded).toBe(4);
        });
    });

    describe("getDateString", () => {
        it("properly handles a date string", () => {
            expect(dateTimeHelper.getDateString("2020-08-10")).toBe("2020-08-10");
        });

        it("properly handles a timestamp string", () => {
            expect(dateTimeHelper.getDateString("2020-08-10 14:05:10")).toBe("2020-08-10");
        });

        it("properly handles a moment instance", () => {
            expect(dateTimeHelper.getDateString(moment("2020-08-10 14:05:10"))).toBe("2020-08-10");
        });
    });
});
