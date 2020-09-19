import { Status } from "./Status";
import { TasksState } from "./TasksState";

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
    downtimeEnabled: boolean;
}
