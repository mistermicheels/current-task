module.exports = {
    // https://stackoverflow.com/a/59888788
    nodeIntegration: false, // is default value after Electron v5
    contextIsolation: true, // protect against prototype pollution
    enableRemoteModule: false, // turn off remote

    // load preload from magic global variable defined by Electron Forge Webpack plugin
    // this preload is shared across all application windows
    // @ts-ignore
    preload: APP_WINDOW_PRELOAD_WEBPACK_ENTRY,
};
