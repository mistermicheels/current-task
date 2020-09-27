const moment = require("moment");

// YYYY-MM-DD
const DATE_STRING_LENGTH = 10;

class DateTimeHelper {
    /**
     * @param {string} timeString Format HH:mm
     * @param {moment.Moment} now
     * @returns {moment.Moment}
     */
    getNextOccurrenceOfTime(timeString, now) {
        const momentFromTimeString = moment(timeString, "HH:mm");

        const specifiedTimeToday = moment(momentFromTimeString)
            .set("year", now.get("year"))
            .set("dayOfYear", now.get("dayOfYear"));

        if (specifiedTimeToday.isAfter(now)) {
            return specifiedTimeToday;
        } else {
            return specifiedTimeToday.add(1, "days");
        }
    }

    /**
     * @param {moment.Moment} timestamp
     * @param {moment.Moment} now
     * @returns {number}
     */
    getSecondsSinceTimestampRounded(timestamp, now) {
        const preciseDiff = moment(now).diff(timestamp, "seconds", true);
        return Math.round(preciseDiff);
    }

    /** @param {string | moment.Moment} timestampOrDate */
    getDateString(timestampOrDate) {
        return moment(timestampOrDate).format().substring(0, DATE_STRING_LENGTH);
    }
}

module.exports = DateTimeHelper;
