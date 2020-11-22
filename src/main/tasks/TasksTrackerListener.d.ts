import { IntegrationConfiguration } from "../configuration/IntegrationConfiguration";

export interface TasksTrackerListener {
    onManualTaskChanged: () => void;
    onIntegrationTypeChanged: () => void;
    onIntegrationConfigurationChanged: (configuration: IntegrationConfiguration<any>) => void;
}
