import { IntegrationType } from "./InternalConfiguration";

export interface TrayMenuBackend {
    changeIntegrationType: (integrationType: IntegrationType) => void;
    setManualCurrentTask: () => void;
    removeManualCurrentTask: () => void;
    configureIntegration: () => void;
    refreshFromIntegration: () => void;
    showFullState: () => void;
    showAdvancedConfigFile: () => void;
    toggleMovingResizingEnabled: () => void;
    resetPositionAndSize: () => void;
    disableForMinutes(minutes: number): void;
    disableUntilSpecificTime(): void;
    enable(): void;

    notifyTrayMenuOpened: () => void;
    notifyTrayMenuClosed: () => void;
}
