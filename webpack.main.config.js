const { getDevtoolOption, sharedPlugins, sharedRules } = require("./webpack.shared");

module.exports = {
    entry: "./src/main/main.js",
    module: {
        rules: sharedRules,
    },
    devtool: getDevtoolOption(process.env),
    plugins: sharedPlugins,
};
