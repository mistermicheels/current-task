const moment = require("moment");

const StatusTimerData = require("./StatusTimerData");

const now = moment("2020-09-19 14:05:10");

describe("StatusTimerData", () => {
    it("treats the first update after create/reset as a status change", () => {
        const statusTimerData = new StatusTimerData(now);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(1, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(0);

        statusTimerData.reset(moment(now).add(2, "seconds"));
        statusTimerData.updateFromCurrentStatus("warning", moment(now).add(3, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(1);

        statusTimerData.reset(moment(now).add(4, "seconds"));
        statusTimerData.updateFromCurrentStatus("error", moment(now).add(5, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(1);
    });

    it("resets secondsInCurrentStatus every time the status changes", () => {
        const statusTimerData = new StatusTimerData(now);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(1, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);

        statusTimerData.updateFromCurrentStatus("warning", moment(now).add(2, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(3, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);
    });

    it("keeps incrementing secondsInCurrentStatus as long as the status stays the same", () => {
        const statusTimerData = new StatusTimerData(now);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(1, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(2, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(1);

        statusTimerData.updateFromCurrentStatus("warning", moment(now).add(3, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(0);

        statusTimerData.updateFromCurrentStatus("warning", moment(now).add(4, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(1);

        statusTimerData.updateFromCurrentStatus("warning", moment(now).add(5, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(2);
    });

    it("keeps incrementing secondsSinceOkStatus as long as status is anything else than 'ok'", () => {
        const statusTimerData = new StatusTimerData(now);
        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(1, "seconds"));

        statusTimerData.updateFromCurrentStatus("warning", moment(now).add(2, "seconds"));
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(1);

        statusTimerData.updateFromCurrentStatus("error", moment(now).add(3, "seconds"));
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(2);
    });

    it("keeps secondsSinceOkStatus at zero as long as status is ok", () => {
        const statusTimerData = new StatusTimerData(now);
        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(1, "seconds"));

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(2, "seconds"));
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(0);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(3, "seconds"));
        expect(statusTimerData.getSecondsSinceOkStatus()).toBe(0);
    });

    it("resets if the last update has been a long time ago", () => {
        const statusTimerData = new StatusTimerData(now);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(1, "seconds"));
        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(2, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(1);

        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(120, "seconds"));
        statusTimerData.updateFromCurrentStatus("ok", moment(now).add(121, "seconds"));
        expect(statusTimerData.getSecondsInCurrentStatus()).toBe(1);
    });
});
