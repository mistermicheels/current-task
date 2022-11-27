/** @typedef { import("electron").Display } Display */
/** @typedef { import("electron").Rectangle } Rectangle */

class AppWindowBoundsCalculator {
    /**
     * @param {Pick<Display, "bounds" | "workArea">} primaryDisplay
     * @param {NodeJS.Platform} platform
     * @returns {Rectangle}
     */
    calculateDefaultBounds(primaryDisplay, platform) {
        // because we are dealing with the primary display, screen bounds start at (0, 0)

        const screenBounds = primaryDisplay.bounds;
        const workAreaBounds = primaryDisplay.workArea;

        const spaceAtTop = workAreaBounds.y;
        const spaceAtBottom = screenBounds.height - workAreaBounds.y - workAreaBounds.height;

        let width;
        let height;
        let x;
        let y;

        if (platform === "win32" && Math.max(spaceAtTop, spaceAtBottom) > 0) {
            // Windows with bottom or top taskbar, try to put window on right half of taskbar

            width = screenBounds.width / 4;
            x = screenBounds.width / 2;

            // https://github.com/mistermicheels/current-task/issues/1
            height = Math.max(spaceAtTop, spaceAtBottom, 38);

            if (spaceAtTop > spaceAtBottom) {
                y = 0;
            } else {
                y = screenBounds.height - height;
            }
        } else {
            // center window at bottom of work area

            width = workAreaBounds.width / 4;
            x = workAreaBounds.x + (workAreaBounds.width - width) / 2;
            height = 40;
            y = screenBounds.height - spaceAtBottom - height;
        }

        return {
            width: Math.round(width),
            height: Math.round(height),
            x: Math.round(x),
            y: Math.round(y),
        };
    }

    /**
     * @param {Pick<Display, "bounds">} primaryDisplay
     * @param {number} naggingProportion
     * @returns {Rectangle}
     */
    calculateNaggingBounds(primaryDisplay, naggingProportion) {
        const screenBounds = primaryDisplay.bounds;

        return {
            width: Math.round(screenBounds.width * naggingProportion),
            height: Math.round(screenBounds.height * naggingProportion),
            x: Math.round((screenBounds.width * (1 - naggingProportion)) / 2),
            y: Math.round((screenBounds.height * (1 - naggingProportion)) / 2),
        };
    }
}

module.exports = AppWindowBoundsCalculator;
