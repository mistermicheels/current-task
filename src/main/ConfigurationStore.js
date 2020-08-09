/** @typedef { import("electron").Rectangle } Rectangle */

/** @typedef { import("./ConfigurationValidator") } ConfigurationValidator */
/** @typedef { import("../types/AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("../types/InternalConfiguration").IntegrationConfiguration } IntegrationConfiguration */

const { app } = require("electron");
const ElectronStore = require("electron-store");
const keytar = require("keytar");
const crypto = require("crypto");
const path = require("path");

const INTERNAL_CONFIG_FILE_NAME = "internal-config-encrypted";
const ADVANCED_CONFIG_FILE_NAME = "advanced-config";

const INTERNAL_CONFIG_INTEGRATION_KEY = "integration";
const INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY = "defaultWindowBounds";

class ConfigurationStore {
    /** @param {ConfigurationValidator} validator */
    constructor(validator) {
        this._validator = validator;
    }

    async initialize() {
        const keytarService = "current-task-internal";
        const keytarAccount = "current-task";
        let internalConfigEncryptionKey = await keytar.getPassword(keytarService, keytarAccount);

        if (!internalConfigEncryptionKey) {
            internalConfigEncryptionKey = crypto.randomBytes(64).toString("hex");
            await keytar.setPassword(keytarService, keytarAccount, internalConfigEncryptionKey);
        }

        this._internalConfigStore = new ElectronStore({
            name: INTERNAL_CONFIG_FILE_NAME,
            encryptionKey: internalConfigEncryptionKey,
        });

        const userDataFolder = app.getPath("userData");
        this._advancedFilePath = path.join(userDataFolder, `${ADVANCED_CONFIG_FILE_NAME}.json`);
    }

    /** @returns {IntegrationConfiguration} */
    getIntegrationConfiguration() {
        // @ts-ignore
        return this._internalConfigStore.get(INTERNAL_CONFIG_INTEGRATION_KEY);
    }

    /** @param {IntegrationConfiguration} value */
    setIntegrationConfiguration(value) {
        this._internalConfigStore.set(INTERNAL_CONFIG_INTEGRATION_KEY, value);
    }

    /** @returns {Rectangle} */
    getDefaultWindowBounds() {
        // @ts-ignore
        return this._internalConfigStore.get(INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY);
    }

    /** @param {Rectangle} value */
    setDefaultWindowBounds(value) {
        this._internalConfigStore.set(INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY, value);
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
            return {};
        }

        const data = store.store;
        this._validator.validateAdvancedConfiguration(data);

        // @ts-ignore
        return data;
    }
}

module.exports = ConfigurationStore;
