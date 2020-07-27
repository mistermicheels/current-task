//@ts-check

/** @typedef { import("./types/Configuration").Configuration } Configuration */

const { app } = require("electron");
const ElectronStore = require("electron-store");
const path = require("path");

class ConfigurationStore {
    constructor() {
        this._configurationFilePath = path.join(app.getPath("userData"), "config.json");
    }

    getConfigurationFilePath() {
        return this._configurationFilePath;
    }

    /** @returns {Configuration} */
    loadFromStore() {
        let store;

        try {
            store = new ElectronStore({ clearInvalidConfig: false });
        } catch (error) {
            throw new Error(`Please put valid JSON data in ${this._configurationFilePath}`);
        }

        const todoistToken = store.get("todoistToken");
        const todoistLabelName = store.get("todoistLabelName");

        if (!todoistToken) {
            store.set("todoistToken", "Token_placeholder");
        }

        if (!todoistLabelName) {
            store.set("todoistLabelName", "Label_name_placeholder");
        }

        if (!todoistToken || !todoistLabelName) {
            throw new Error(`Please update configuration data in ${this._configurationFilePath}`);
        }

        // @ts-ignore
        return store.store;
    }
}

module.exports = ConfigurationStore;
