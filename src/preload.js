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
        let validChannels = ["fromMain"]; // src/types/Global.d.ts
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
});
