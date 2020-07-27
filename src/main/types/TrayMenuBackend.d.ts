export interface TrayMenuBackend {
    showFullState: () => void;
    showConfigFile: () => void;
    setMovingResizingEnabled: (enabled: boolean) => void;
}
