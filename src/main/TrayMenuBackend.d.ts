import { IntegrationType } from "./configuration/IntegrationConfiguration";

export interface TrayMenuBackend {
    showAbout: () => void;
    changeIntegrationType: (integrationType: IntegrationType) => void;
    setManualCurrentTask: () => void;
    removeManualCurrentTask: () => void;
    refreshCalendars: () => void;
    configureIntegration: () => void;
    showCalculatedState: () => void;
    showAdvancedConfigFile: () => void;
    reloadAdvancedConfigFile: () => void;
    showLogFile: () => void;
    toggleDetailedStateCalculationLoggingEnabled: () => void;
    toggleDetailedIntegrationLoggingEnabled: () => void;
    toggleMovingResizingEnabled: () => void;
    resetPositionAndSize: () => void;
    disableForMinutes(minutes: number): void;
    disableUntilSpecificTime(): void;
    enable(): void;
    close(): void;

    notifyTrayMenuOpened: () => void;
    notifyTrayMenuClosed: () => void;
}
