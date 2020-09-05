const LicenseWebpackPlugin = require("license-webpack-plugin").LicenseWebpackPlugin;
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    sharedRules: [
        {
            test: /\.(m?js|node)$/,
            parser: { amd: false },
            use: {
                // fork of zeit/webpack-asset-relocator-loader with some fixes that we need
                // see also https://github.com/electron-userland/electron-forge/issues/1688
                // create-electron-app included this one by default, next to another one that we removed because of above GitHub issue
                loader: "@marshallofsound/webpack-asset-relocator-loader",
                options: {
                    outputAssetBase: "native_modules",
                },
            },
        },
    ],
    sharedPlugins: [
        new LicenseWebpackPlugin(),
        new CopyPlugin({
            patterns: ["LICENSE"],
        }),
    ],
    getDevtoolOption(env) {
        if (env.npm_lifecycle_event.startsWith("make")) {
            return false;
        } else if (env.npm_lifecycle_event.startsWith("start")) {
            return "eval-cheap-source-map";
        }

        throw new Error(
            `Cannot determine Webpack devtool option value for npm lifecycle event ${env.npm_lifecycle_event}`
        );
    },
};
