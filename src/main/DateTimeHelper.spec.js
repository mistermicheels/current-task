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
});
