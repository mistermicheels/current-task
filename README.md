# CurrentTask

This is a desktop app that helps you to focus on one task at a time.

For more information about the app itself, please see [the website](https://current-task.mistermicheels.com/).

## Development

### Technology

The application is built using Electron. This allows using languages like JS, HTML and CSS that a lot of people are familiar with. It also makes it relatively easy to support multiple operating systems. Drawbacks are the relatively high memory use (compared to what you would expect from native code) and the fact that Electron has some bugs/limitations that we sometimes need to work around.

The application's code is bundled using Webpack. This affects the way pages are loaded into windows (using magic global variables provided by Electron Forge) as well as the way the pages load the JS, CSS and images they depend on (configured using `config.forge.plugins` in `package.json` and the top-level webpack configuration files). See also [Electron Forge Webpack documentation](https://www.electronforge.io/config/plugins/webpack).

### Running the app locally

It's recommended to install dependencies using `npm ci` to avoid any version mismatches.

You can run the app using `npm run start`, which will also generate the JSON Schema used to validate the advanced configuration file. If the schema is already there, you can choose to skip this schema generation step by running the app using `npm run start-no-generate`.

### Build scripts

The `prepare-make` script defines several checks that should pass for every commit that is made (enforced using a pre-commit hook defined by Husky):

-   Code should be formatted according to Prettier code style. This is easy to achieve by using VS Code and installing the recommended Prettier plugin as defined in `.vscode/extensions.json`. The `.vscode/settings.json` file configures VS Code to automatically format files on save. Make sure that you select Prettier as the formatter to use. Note that Prettier expects to find LF line endings and that the automatic formatting does not adjust line endings if needed.
-   Code should pass TypeScript type checking. If you use VS Code, it will notify you of errors as you code.
-   All of the unit tests should pass.

The `prepare-make` script also generates a fresh JSON Schema for the advanced configuration file. This is used by the unit tests and is also included with the finished application.

The `make-windows` and `make-mac` scripts are platform-specific scripts that take care of building the application. They are run on every push using GitHub actions. The resulting installers are made available as artifacts.

## Contributing

If you want to contribute to the development of this application, please review the [contributing guidelines](./CONTRIBUTING.md).
