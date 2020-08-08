//@ts-check

/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("./types/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("./types/InternalConfiguration").IntegrationConfiguration } IntegrationConfiguration */

const { app } = require("electron");
const ElectronStore = require("electron-store");
const path = require("path");

const INTERNAL_CONFIG_FILE_NAME = "internal-config";
const ADVANCED_CONFIG_FILE_NAME = "advanced-config";

const INTERNAL_CONFIG_INTEGRATION_KEY = "integration";
const INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY = "defaultWindowBounds";

class ConfigurationStore {
    constructor() {
        const userDataFolder = app.getPath("userData");
        this._advancedFilePath = path.join(userDataFolder, `${ADVANCED_CONFIG_FILE_NAME}.json`);

        this._internalConfigurationStore = new ElectronStore({
            name: INTERNAL_CONFIG_FILE_NAME,
        });
    }

    /** @returns {IntegrationConfiguration} */
    getIntegrationConfiguration() {
        // @ts-ignore
        return this._internalConfigurationStore.get(INTERNAL_CONFIG_INTEGRATION_KEY);
    }

    /** @param {IntegrationConfiguration} value */
    setIntegrationConfiguration(value) {
        this._internalConfigurationStore.set(INTERNAL_CONFIG_INTEGRATION_KEY, value);
    }

    /** @returns {Rectangle} */
    getDefaultWindowBounds() {
        // @ts-ignore
        return this._internalConfigurationStore.get(INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY);
    }

    /** @param {Rectangle} value */
    setDefaultWindowBounds(value) {
        this._internalConfigurationStore.set(INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY, value);
    }

    getAdvancedConfigurationFilePath() {
        return this._advancedFilePath;
    }

    /** @returns {AdvancedConfiguration} */
    loadAdvancedConfiguration() {
        let store;

        try {
            store = new ElectronStore({
                name: ADVANCED_CONFIG_FILE_NAME,
                clearInvalidConfig: false,
            });
        } catch (error) {
            throw new Error(`Please put valid JSON data in ${this._advancedFilePath}`);
        }

        if (store.size === 0) {
            // if the file doesn't exist yet, this initializes it with an empty JSON object
            store.clear();
        }

        // @ts-ignore
        return store.store;
    }
}

module.exports = ConfigurationStore;
