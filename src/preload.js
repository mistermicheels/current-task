// https://stackoverflow.com/a/59888788

const { contextBridge, ipcRenderer } = require("electron");

// expose protected methods for the renderer process to use
contextBridge.exposeInMainWorld("api", {
    send: (channel, data) => {
        // whitelisted channels
        let validChannels = [
            "appWindowMoved",
            "appWindowMoving",
            "dialogContentsHidden",
            "dialogHeight",
            "dialogResult",
        ];

        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        // whitelisted channels
        let validChannels = [
            "appVersion",
            "appWindowStyle",
            "dialogInput",
            "dialogShown",
            "hideDialogContents",
            "statusAndMessage",
        ];

        if (validChannels.includes(channel)) {
            // deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (_event, ...args) => func(...args));
        }
    },
});
