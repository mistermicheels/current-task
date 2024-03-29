import { CalendarEventWithCalendarName } from "../calendar-events/CalendarEvent";
import { Status } from "../configuration/Status";
import { TasksSummary } from "../tasks/TasksSummary";

import { WindowState } from "./WindowState";

export interface CalculatedStateSnapshot extends TasksSummary, WindowState {
    activeCalendarEvents: CalendarEventWithCalendarName[];
    dayOfWeek: number;
    hours: number;
    minutes: number;
    seconds: number;
    status: Status;
    message: string;
    secondsInCurrentStatus: number;
    secondsSinceOkStatus: number;
    naggingEnabled: boolean;
    blinkingEnabled: boolean;
    downtimeEnabled: boolean;
    customStateShouldClearCurrent: boolean;
}
