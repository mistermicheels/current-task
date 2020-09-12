// types for src/preload.js

interface Window {
    api: {
        send: (channel: RendererToMainChannel, data: any) => void;
        receive: (channel: MainToRendererChannel, func: (...args) => void) => void;
    };
}

type RendererToMainChannel =
    | "appWindowMoved"
    | "appWindowMoving"
    | "dialogContentsHidden"
    | "dialogHeight"
    | "dialogResult";

type MainToRendererChannel =
    | "appVersion"
    | "appWindowStyle"
    | "dialogInput"
    | "dialogShown"
    | "hideDialogContents"
    | "statusAndMessage";
