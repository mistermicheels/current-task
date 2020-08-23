import { IntegrationConfiguration } from "../types/InternalConfiguration";

export interface TasksStateProviderListener {
    onManualTasksStateChanged: () => void;
    onIntegrationTypeChanged: () => void;
    onIntegrationConfigurationChanged: (configuration: IntegrationConfiguration<any>) => void;
}
