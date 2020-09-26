import { IntegrationType } from "./configuration/IntegrationConfiguration";

export interface TrayMenuBackend {
    showAbout: () => void;
    changeIntegrationType: (integrationType: IntegrationType) => void;
    setManualCurrentTask: () => void;
    removeManualCurrentTask: () => void;
    configureIntegration: () => void;
    showFullState: () => void;
    showAdvancedConfigFile: () => void;
    reloadAdvancedConfigFile: () => void;
    showLogFile: () => void;
    toggleDetailedAppStateLoggingEnabled: () => void;
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
