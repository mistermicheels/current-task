import { Status } from "../configuration/Status";
import { TasksSummary } from "../tasks/TasksSummary";

import { WindowState } from "./WindowState";

export interface CalculatedStateSnapshot extends TasksSummary, WindowState {
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
