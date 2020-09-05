const { getDevtoolOption, sharedPlugins, sharedRules } = require("./webpack.shared");

module.exports = {
    module: {
        rules: [
            ...sharedRules,
            {
                test: /\.css$/,
                use: [{ loader: "style-loader" }, { loader: "css-loader" }],
            },
            {
                test: /\.svg$/,
                use: {
                    loader: "svg-url-loader",
                    options: {
                        encoding: "base64",
                    },
                },
            },
        ],
    },
    devtool: getDevtoolOption(process.env),
    plugins: sharedPlugins,
};
