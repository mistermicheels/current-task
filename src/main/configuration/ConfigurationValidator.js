const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");

class ConfigurationValidator {
    constructor() {
        // schema is automatically generated, see package.json
        // only read the schema once, on startup
        // note that the sync read has very little impact, not worth making it async

        const schemaPath = path.join(__dirname, "../../../generated/advanced-config-schema.json");
        this._schema = JSON.parse(fs.readFileSync(schemaPath).toString("utf-8"));
    }

    validateAdvancedConfiguration(data) {
        const ajv = new Ajv();
        const valid = ajv.validate(this._schema, data);

        if (!valid) {
            const firstError = ajv.errors[0];
            let message;

            if (firstError.keyword === "additionalProperties") {
                const propertyName = firstError.params["additionalProperty"];
                const propertyPath = firstError.dataPath;
                message = `Additional property '${propertyName}' not allowed at '${propertyPath}'`;
            } else if (firstError.keyword === "enum") {
                const propertyPath = firstError.dataPath;
                const allowedValues = firstError.params["allowedValues"];
                message = `${propertyPath} should be one of [${allowedValues.join(", ")}]`;
            } else {
                message = `${firstError.dataPath} ${firstError.message}`;
            }

            throw new Error(message);
        }
    }
}

module.exports = ConfigurationValidator;
