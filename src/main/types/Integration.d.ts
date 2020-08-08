import { TaskData } from "./TaskData";

export interface Integration {
    getRelevantTasksForState: () => Promise<TaskData[]>;
    performCleanup: () => Promise<void>;
}
