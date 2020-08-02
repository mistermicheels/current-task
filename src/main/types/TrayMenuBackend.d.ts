export interface TrayMenuBackend {
    showFullState: () => void;
    showConfigFile: () => void;
    setMovingResizingEnabled: (enabled: boolean) => void;
    resetPositionAndSize: () => void;
    disableForMinutes(minutes: number): void;
    enable(): void;
}
