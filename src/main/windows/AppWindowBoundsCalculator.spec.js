/** @typedef { import("electron").Display } Display */
/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef {"Top" | "Bottom" | "Left" | "Right"} TaskbarPosition*/

const AppWindowBoundsCalculator = require("./AppWindowBoundsCalculator");

const screenBounds = { width: 800, height: 600, x: 0, y: 0 };

/**
 * @param {number} size
 * @param {TaskbarPosition} position
 * @returns {Pick<Display, "bounds" | "workArea">}
 */
function getDisplayWithTaskbar(size, position) {
    return {
        bounds: screenBounds,
        workArea: getWorkAreaForTaskbar(size, position),
    };
}

/**
 * @param {number} size
 * @param {TaskbarPosition} position
 * @returns {Rectangle}
 */
function getWorkAreaForTaskbar(size, position) {
    if (position === "Top") {
        return { width: screenBounds.width, height: screenBounds.height - size, x: 0, y: size };
    } else if (position === "Bottom") {
        return { width: screenBounds.width, height: screenBounds.height - size, x: 0, y: 0 };
    } else if (position === "Left") {
        return { width: screenBounds.width - size, height: screenBounds.height, x: size, y: 0 };
    } else {
        return { width: screenBounds.width - size, height: screenBounds.height, x: 0, y: 0 };
    }
}

/**
 * @param {Rectangle} bounds
 */
function getSpaceToLeft(bounds) {
    return bounds.x;
}

/**
 * @param {Rectangle} bounds
 * @param {Pick<Display, "bounds">} display
 */
function getSpaceToRight(bounds, display) {
    return display.bounds.width - bounds.x - bounds.width;
}

const calculator = new AppWindowBoundsCalculator();

describe("AppWindowBoundsCalculator", () => {
    describe("default bounds calculation", () => {
        describe("on Windows with bottom taskbar", () => {
            it("puts the window on the right half of the taskbar", () => {
                const display = getDisplayWithTaskbar(60, "Bottom");
                const bounds = calculator.calculateDefaultBounds(display, "win32");

                expect(bounds.width).toEqual(display.bounds.width / 4);
                expect(bounds.x).toEqual(display.bounds.width / 2);
                expect(bounds.height).toEqual(60);
                expect(bounds.y).toEqual(display.bounds.height - 60);
            });

            it("makes the window at least 38px high", () => {
                const display = getDisplayWithTaskbar(20, "Bottom");
                const bounds = calculator.calculateDefaultBounds(display, "win32");

                expect(bounds.width).toEqual(display.bounds.width / 4);
                expect(bounds.x).toEqual(display.bounds.width / 2);
                expect(bounds.height).toEqual(38);
                expect(bounds.y).toEqual(display.bounds.height - 38);
            });
        });

        describe("on Windows with top taskbar", () => {
            it("puts the window on the right half of the taskbar", () => {
                const display = getDisplayWithTaskbar(60, "Top");
                const bounds = calculator.calculateDefaultBounds(display, "win32");

                expect(bounds.width).toEqual(display.bounds.width / 4);
                expect(bounds.x).toEqual(display.bounds.width / 2);
                expect(bounds.height).toEqual(60);
                expect(bounds.y).toEqual(0);
            });

            it("makes the window at least 38px high", () => {
                const display = getDisplayWithTaskbar(20, "Top");
                const bounds = calculator.calculateDefaultBounds(display, "win32");

                expect(bounds.width).toEqual(display.bounds.width / 4);
                expect(bounds.x).toEqual(display.bounds.width / 2);
                expect(bounds.height).toEqual(38);
                expect(bounds.y).toEqual(0);
            });
        });

        describe("on Mac with bottom dock", () => {
            it("centers the window at the bottom of the work area", () => {
                const display = getDisplayWithTaskbar(100, "Bottom");
                const bounds = calculator.calculateDefaultBounds(display, "darwin");

                const spaceToLeft = getSpaceToLeft(bounds);
                const spaceToRight = getSpaceToRight(bounds, display);
                expect(bounds.width).toEqual(display.workArea.width / 4);
                expect(spaceToRight).toEqual(spaceToLeft);
                expect(bounds.height).toEqual(40);
                expect(bounds.y).toEqual(display.bounds.height - 40 - 100);
            });
        });

        describe("on Mac with top dock", () => {
            it("centers the window at the bottom of the work area", () => {
                const display = getDisplayWithTaskbar(100, "Top");
                const bounds = calculator.calculateDefaultBounds(display, "darwin");

                const spaceToLeft = getSpaceToLeft(bounds);
                const spaceToRight = getSpaceToRight(bounds, display);
                expect(bounds.width).toEqual(display.workArea.width / 4);
                expect(spaceToRight).toEqual(spaceToLeft);
                expect(bounds.height).toEqual(40);
                expect(bounds.y).toEqual(display.bounds.height - 40);
            });
        });

        describe("on Windows/Mac with left taskbar/dock", () => {
            it("centers the window at the bottom of the work area", () => {
                /** @type {NodeJS.Platform[]} */
                const platforms = ["win32", "darwin"];

                for (const platform of platforms) {
                    const display = getDisplayWithTaskbar(80, "Left");
                    const bounds = calculator.calculateDefaultBounds(display, platform);

                    const spaceToLeft = getSpaceToLeft(bounds);
                    const spaceToRight = getSpaceToRight(bounds, display);
                    expect(bounds.width).toEqual(display.workArea.width / 4);
                    expect(spaceToRight).toEqual(spaceToLeft - 80);
                    expect(bounds.height).toEqual(40);
                    expect(bounds.y).toEqual(display.bounds.height - 40);
                }
            });
        });

        describe("on Windows/Mac with right taskbar/dock", () => {
            it("centers the window at the bottom of the work area", () => {
                /** @type {NodeJS.Platform[]} */
                const platforms = ["win32", "darwin"];

                for (const platform of platforms) {
                    const display = getDisplayWithTaskbar(80, "Right");
                    const bounds = calculator.calculateDefaultBounds(display, platform);

                    const spaceToLeft = getSpaceToLeft(bounds);
                    const spaceToRight = getSpaceToRight(bounds, display);
                    expect(bounds.width).toEqual(display.workArea.width / 4);
                    expect(spaceToRight - 80).toEqual(spaceToLeft);
                    expect(bounds.height).toEqual(40);
                    expect(bounds.y).toEqual(display.bounds.height - 40);
                }
            });
        });
    });
});
