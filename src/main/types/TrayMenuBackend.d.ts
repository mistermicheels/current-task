export interface TrayMenuBackend {
    showFullState: () => void;
    showConfigFile: () => void;
    toggleMovingResizingEnabled: () => void;
    resetPositionAndSize: () => void;
    disableForMinutes(minutes: number): void;
    enable(): void;
}
