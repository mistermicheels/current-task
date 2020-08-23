// https://stackoverflow.com/a/59888788

const { contextBridge, ipcRenderer } = require("electron");

// expose protected methods for the renderer process to use
contextBridge.exposeInMainWorld("api", {
    send: (channel, data) => {
        // whitelisted channels, also defined in src/types/Global.d.ts
        let validChannels = ["appWindowMoved", "appWindowMoving", "dialogHeight", "dialogResult"];

        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        // whitelisted channels, also defined in src/types/Global.d.ts
        let validChannels = ["dialogInput", "statusAndMessage"];

        if (validChannels.includes(channel)) {
            // deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
});
