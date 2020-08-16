import { DialogField } from "./DialogInput";
import { IntegrationConfiguration, IntegrationType } from "./InternalConfiguration";
import { TaskData } from "./TaskData";

export interface Integration<T extends IntegrationType> {
    getConfigurationDialogFields(): DialogField[];
    configure(configuration: IntegrationConfiguration<T>): void;
    getRelevantTasksForState: () => Promise<TaskData[]>;
    performCleanup: () => Promise<void>;
}
