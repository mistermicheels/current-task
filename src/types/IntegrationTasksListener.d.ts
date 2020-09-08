import { Integration } from "./Integration";
import { TaskData } from "./TaskData";

export interface IntegrationTasksListener {
    onTasksRefreshed: (
        tasks: TaskData[],
        errorMessage: string,
        integrationClassInstance: Integration<any>
    ) => void;
}
