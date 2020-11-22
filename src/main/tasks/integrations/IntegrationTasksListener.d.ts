import { Integration } from "./Integration";
import { IntegrationTask } from "./IntegrationTask";

export interface IntegrationTasksListener {
    onTasksRefreshed: (
        tasks: IntegrationTask[],
        errorMessage: string,
        integrationClassInstance: Integration<any>
    ) => void;
}
