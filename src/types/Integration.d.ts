import { DialogField } from "./DialogInput";
import { IntegrationConfiguration, IntegrationType } from "./InternalConfiguration";
import { TaskData } from "./TaskData";

export interface Integration<T extends IntegrationType> {
    getConfigurationDialogFields(): DialogField[];
    configure(configuration: IntegrationConfiguration<T>): void;

    /**
     * Should include all tasks that are either planned for today, overdue or marked as current and that aren't assigned to someone else.
     * Integrations can deviate from this as long as it's made clear to the user when they are configuring the integration.
     */
    getRelevantTasksForState: () => Promise<TaskData[]>;

    /**
     * Called at relatively low frequency. Should include any periodic housekeeping done by the integration.
     * Example: removing the label from tasks that should be ignored.
     */
    performCleanup: () => Promise<void>;
}
