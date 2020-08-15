const moment = require("moment");

const DisabledState = require("./DisabledState");

describe("DisabledState", () => {
    it("starts with the app enabled", () => {
        const disabledState = new DisabledState();
        expect(disabledState.isAppDisabled()).toBe(false);
    });

    it("allows disabling the app for a certain duration", () => {
        const disabledState = new DisabledState();
        const start = moment();
        disabledState.disableAppForMinutes(15, start);
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment(start).add(10, "minutes"));
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment(start).add(14, "minutes").add(59, "seconds"));
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment(start).add(15, "minutes"));
        expect(disabledState.isAppDisabled()).toBe(false);

        disabledState.update(moment(start).add(20, "minutes"));
        expect(disabledState.isAppDisabled()).toBe(false);
    });

    it("allows disabling the app until a specific time later today", () => {
        const disabledState = new DisabledState();
        const start = moment("2020-08-10 14:05:10");
        disabledState.disableAppUntil("14:10", start);
        expect(disabledState.isAppDisabled()).toBe(true);
        expect(disabledState.getReason()).toBeUndefined();

        disabledState.update(moment("2020-08-10 14:09:59"));
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment("2020-08-10 14:10:00"));
        expect(disabledState.isAppDisabled()).toBe(false);

        disabledState.update(moment("2020-08-10 14:10:01"));
        expect(disabledState.isAppDisabled()).toBe(false);
    });

    it("allows disabling the app until a specific time that crosses the day boundary", () => {
        const disabledState = new DisabledState();
        const start = moment("2020-08-10 14:05:10");
        disabledState.disableAppUntil("14:00", start);
        expect(disabledState.isAppDisabled()).toBe(true);
        expect(disabledState.getReason()).toBeUndefined();

        disabledState.update(moment("2020-08-10 14:10:00"));
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment("2020-08-11 00:00:00"));
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment("2020-08-11 13:59:59"));
        expect(disabledState.isAppDisabled()).toBe(true);

        disabledState.update(moment("2020-08-11 14:00:00"));
        expect(disabledState.isAppDisabled()).toBe(false);

        disabledState.update(moment("2020-08-11 14:00:01"));
        expect(disabledState.isAppDisabled()).toBe(false);
    });

    it("allows specifying a reason for disabling until a specific time", () => {
        const disabledState = new DisabledState();
        const start = moment("2020-08-10 14:05:10");
        const reason = "Giving a presentation";
        disabledState.disableAppUntil("14:10", start, reason);
        expect(disabledState.isAppDisabled()).toBe(true);
        expect(disabledState.getReason()).toBe(reason);
    });

    it("allows manually enabling the app again", () => {
        const disabledState = new DisabledState();
        const start = moment();
        disabledState.disableAppForMinutes(15, start);
        disabledState.enableApp();
        expect(disabledState.isAppDisabled()).toBe(false);

        disabledState.update(moment(start).add(10, "minutes"));
        expect(disabledState.isAppDisabled()).toBe(false);
    });
});
