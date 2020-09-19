import { IntegrationConfiguration } from "../configuration/IntegrationConfiguration";

export interface TasksStateProviderListener {
    onManualTasksStateChanged: () => void;
    onIntegrationTypeChanged: () => void;
    onIntegrationConfigurationChanged: (configuration: IntegrationConfiguration<any>) => void;
}
