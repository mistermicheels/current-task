import { Status } from "./Status";
import { TasksState } from "./TasksState";

export interface AppStateSnapshot extends TasksState {
    dayOfWeek: number;
    hours: number;
    minutes: number;
    seconds: number;
    status: Status;
    message: string;
    naggingEnabled: boolean;
    downtimeEnabled: boolean;
}
