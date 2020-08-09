interface Window {
    // src/preload.js
    api: {
        send: (channel: "dialogHeight" | "dialogResult", data: any) => void;
        receive: (channel: "fromMain", func: (...args) => void) => void;
    };
}
