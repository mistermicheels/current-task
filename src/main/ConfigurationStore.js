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

    loadFromStore() {
        let store;

        try {
            store = new ElectronStore({ clearInvalidConfig: false });
        } catch (error) {
            throw new Error(`Please put valid JSON data in ${this._configurationFilePath}`);
        }

        const todoistToken = store.get("todoistToken_DO_NOT_SHARE_THIS");
        const todoistLabelName = store.get("todoistLabelName");

        if (!todoistToken) {
            store.set("todoistToken_DO_NOT_SHARE_THIS", "Token_placeholder");
        }

        if (!todoistLabelName) {
            store.set("todoistLabelName", "Label_name_placeholder");
        }

        if (!todoistToken || !todoistLabelName) {
            throw new Error(`Please update configuration data in ${this._configurationFilePath}`);
        }

        const customStateRules = store.get("customStateRules");
        const includeFutureTasksWithLabel = store.get("includeFutureTasksWithLabel");
        const naggingConditions = store.get("naggingConditions");
        const downtimeConditions = store.get("downtimeConditions");

        return {
            todoistLabelName,
            todoistToken,
            includeFutureTasksWithLabel,
            customStateRules,
            naggingConditions,
            downtimeConditions,
        };
    }
}

module.exports = ConfigurationStore;
