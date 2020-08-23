export interface TasksStateProviderListener {
    onManualTasksStateChanged: () => void;
    onIntegrationTypeChanged: () => void;
}
