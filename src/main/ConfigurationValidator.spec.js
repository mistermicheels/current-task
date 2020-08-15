const ConfigurationValidator = require("./ConfigurationValidator");

const configurationValidator = new ConfigurationValidator();

describe("ConfigurationValidator", () => {
    it("allows valid configuration with missing optional properties", () => {
        const configuration = {
            requireReasonForDisabling: false,
            forbidClosingFromTray: true,
            customStateRules: [],
        };

        configurationValidator.validateAdvancedConfiguration(configuration);
    });

    it("fails for configuration with missing required deeper properties", () => {
        const configuration = {
            customStateRules: [
                {
                    resultingStatus: "ok",
                    resultingMessage: "Test",
                },
            ],
        };

        expect(() => configurationValidator.validateAdvancedConfiguration(configuration)).toThrow(
            "Invalid advanced configuration file: .customStateRules[0] should have required property 'condition'"
        );
    });

    it("fails for configuration with unknown top-level properties", () => {
        const configuration = {
            whoops: true,
        };

        expect(() => configurationValidator.validateAdvancedConfiguration(configuration)).toThrow(
            "Invalid advanced configuration file: Additional property 'whoops' not allowed at ''"
        );
    });

    it("fails for configuration with unknown deeper properties", () => {
        const configuration = {
            customStateRules: [
                {
                    condition: {},
                    resultingStatus: "ok",
                    resultingMessage: "Test",
                    whoops: true,
                },
            ],
        };

        expect(() => configurationValidator.validateAdvancedConfiguration(configuration)).toThrow(
            "Invalid advanced configuration file: Additional property 'whoops' not allowed at '.customStateRules[0]'"
        );
    });

    it("fails for configuration with non-allowed value types at the top level", () => {
        const configuration = {
            customStateRules: false,
        };

        expect(() => configurationValidator.validateAdvancedConfiguration(configuration)).toThrow(
            "Invalid advanced configuration file: .customStateRules should be array"
        );
    });

    it("fails for configuration with non-allowed value types at a deeper level", () => {
        const configuration = {
            customStateRules: [
                {
                    condition: true,
                    resultingStatus: "ok",
                    resultingMessage: "Test",
                },
            ],
        };

        expect(() => configurationValidator.validateAdvancedConfiguration(configuration)).toThrow(
            "Invalid advanced configuration file: .customStateRules[0].condition should be object"
        );
    });

    it("fails for configuration with non-allowed enum values", () => {
        const configuration = {
            naggingConditions: [{ status: "whoops" }],
        };

        expect(() => configurationValidator.validateAdvancedConfiguration(configuration)).toThrow(
            "Invalid advanced configuration file: .naggingConditions[0].status should be one of [ok, warning, error]"
        );
    });
});
