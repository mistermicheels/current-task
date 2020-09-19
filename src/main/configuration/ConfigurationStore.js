/** @typedef { import("electron").Rectangle } Rectangle */
/** @typedef { import("../Logger") } Logger */
/** @typedef { import("./AdvancedConfiguration").AdvancedConfiguration } AdvancedConfiguration */
/** @typedef { import("./IntegrationConfiguration").IntegrationConfiguration } IntegrationConfiguration */

const { app } = require("electron");
const ElectronStore = require("electron-store");
const keytar = require("keytar");
const crypto = require("crypto");
const path = require("path");

const ConfigurationValidator = require("./ConfigurationValidator");

const INTERNAL_CONFIG_FILE_NAME = "internal-config-encrypted";
const ADVANCED_CONFIG_FILE_NAME = "advanced-config";

const INTERNAL_CONFIG_INTEGRATION_KEY = "integration";
const INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY = "defaultWindowBounds";
const INTERNAL_CONFIG_MOVING_RESIZING_ENABLED_KEY = "movingResizingEnabled";

class ConfigurationStore {
    /**
     * @param {Logger} logger
     */
    constructor(logger) {
        this._validator = new ConfigurationValidator();
        this._logger = logger;
    }

    async initialize() {
        const keytarService = "current-task-internal";
        const keytarAccount = "current-task";
        let internalConfigEncryptionKey = await keytar.getPassword(keytarService, keytarAccount);

        if (internalConfigEncryptionKey) {
            this._logger.info("Found existing internal configuration encryption key");
        } else {
            internalConfigEncryptionKey = crypto.randomBytes(64).toString("hex");
            await keytar.setPassword(keytarService, keytarAccount, internalConfigEncryptionKey);
            this._logger.info("Generated new internal configuration encryption key");
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
        this._logger.info("Saved new integration configuration");
    }

    /** @returns {Rectangle} */
    getDefaultWindowBounds() {
        // @ts-ignore
        return this._internalConfigStore.get(INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY);
    }

    /** @param {Rectangle} value */
    setDefaultWindowBounds(value) {
        this._internalConfigStore.set(INTERNAL_CONFIG_DEFAULT_WINDOW_BOUNDS_KEY, value);
        this._logger.info("Saved default app window position and size");
    }

    /** @returns {boolean} */
    getMovingResizingEnabled() {
        // @ts-ignore
        return this._internalConfigStore.get(INTERNAL_CONFIG_MOVING_RESIZING_ENABLED_KEY);
    }

    /** @param {boolean} value */
    setMovingResizingEnabled(value) {
        this._internalConfigStore.set(INTERNAL_CONFIG_MOVING_RESIZING_ENABLED_KEY, value);
        this._logger.info(`Saved moving and resizing enabled: ${value}`);
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
            this._logger.error("Invalid JSON in advanced configuration file");
            throw new Error(`Please put valid JSON data in ${this._advancedFilePath}`);
        }

        if (store.size === 0) {
            // if the file doesn't exist yet, this initializes it with an empty JSON object
            store.clear();
            return {};
        }

        const data = store.store;

        try {
            this._validator.validateAdvancedConfiguration(data);
        } catch (error) {
            this._logger.error(`Invalid advanced configuration file: ${error.message}`);
            throw new Error(`Invalid data in ${this._advancedFilePath}: ${error.message}`);
        }

        // @ts-ignore
        return data;
    }
}

module.exports = ConfigurationStore;
