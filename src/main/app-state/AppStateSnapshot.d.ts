import { Status } from "../configuration/Status";
import { TasksState } from "../tasks-state/TasksState";

export interface AppStateSnapshot extends TasksState {
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
