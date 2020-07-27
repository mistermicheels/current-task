import { TaskData } from "./TaskData";

export interface Integration {
    initialize: () => Promise<void>;
    getRelevantTasksForState: () => Promise<TaskData[]>;
    performCleanup: () => Promise<void>;
}
