export interface TrayMenuBackend {
    configureTodoistIntegration: () => void;
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
