import { IntegrationType } from "./InternalConfiguration";

export interface TrayMenuBackend {
    showAbout: () => void;
    changeIntegrationType: (integrationType: IntegrationType) => void;
    setManualCurrentTask: () => void;
    removeManualCurrentTask: () => void;
    configureIntegration: () => void;
    refreshFromIntegration: () => void;
    showFullState: () => void;
    showAdvancedConfigFile: () => void;
    showLogFile: () => void;
    toggleDetailedLoggingEnabled: () => void;
    toggleMovingResizingEnabled: () => void;
    resetPositionAndSize: () => void;
    disableForMinutes(minutes: number): void;
    disableUntilSpecificTime(): void;
    enable(): void;

    notifyTrayMenuOpened: () => void;
    notifyTrayMenuClosed: () => void;
}
