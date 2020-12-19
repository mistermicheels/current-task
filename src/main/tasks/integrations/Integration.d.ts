import {
    IntegrationConfiguration,
    IntegrationType,
} from "../../configuration/IntegrationConfiguration";
import { DialogField } from "../../windows/DialogInput";
import { IntegrationTask } from "./IntegrationTask";

export interface Integration<T extends IntegrationType> {
    getConfigurationDialogFields(): DialogField[];
    configure(configuration: IntegrationConfiguration<T>): void;

    /**
     * Should include all tasks that are either planned for today, overdue or marked as current.
     * Other tasks can be included as well, but they will not impact calculations.
     * Integrations can deviate from this as long as it's made clear to the user when they are configuring the integration.
     */
    getRelevantTasksForState: () => Promise<IntegrationTask[]>;

    /**
     * After this, no task is marked as current
     */
    clearCurrent: () => Promise<void>;

    /**
     * Should return true if there is a need for performing cleanup
     */
    isCleanupNeeded: () => boolean;

    /**
     * Performs cleanup
     * Example: removing the label from tasks that should be ignored.
     */
    performCleanup: () => Promise<void>;
}
