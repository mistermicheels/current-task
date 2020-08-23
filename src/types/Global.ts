interface Window {
    // src/preload.js
    api: {
        send: (channel: RendererToMainChannel, data: any) => void;
        receive: (channel: MainToRendererChannel, func: (...args) => void) => void;
    };
}

type RendererToMainChannel = "appWindowMoved" | "appWindowMoving" | "dialogHeight" | "dialogResult";
type MainToRendererChannel = "dialogInput" | "statusAndMessage";
