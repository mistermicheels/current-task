# CurrentTask

This is an app that helps you to use your screen time in a productive way by focusing on one task or goal at a time.

It integrates with Todoist and requires you to label exactly one task (scheduled for today, overdue or without a date) as the current screen-based task you are working on. Periodically, it checks for tasks set for a date in the future that are marked as current task and removes the label from them (this is useful for recurring tasks).

The UI is an overlay over the Window taskbar, but it transforms into a nag screen based on conditions that can be specified in the configuration file.

The app is written using Electron (which explains the amount of memory it uses) and only tested to work on Windows.

## Advanced configuration

Optionally, you can also specify the following additional settings:

-   `requireReasonForDisabling`: Don't allow disabling the app from the tray icon menu without specifying a reason (might help with self-control)
-   `forbidClosingFromTray`: Don't allow closing the app from the tray icon men (might help with self-control)
-   `customStateRules`: Define custom rules with a condition and the resulting status and message (only the first matching rule will apply)
-   `naggingConditions`: Define when the UI should transform into a nag screen rather than a taskbar overlay
-   `downtimeConditions`: Define when the UI should be hidden, allowing you to do whatever you want without the app bothering you

Full configuration example:

```
{
    "requireReasonForDisabling": true,
    "forbidClosingFromTray": true,
    "customStateRules": [
        {
            "condition": {
                "numberOverdueWithTimeNotMarkedCurrent": { "moreThan": 0 }
            },
            "resultingStatus": "warning",
            "resultingMessage": "Scheduled task"
        },
        {
            "condition": {
                "numberMarkedCurrent": { "lessThan": 1 }
            },
            "resultingStatus": "error",
            "resultingMessage": "No current task"
        },
        {
            "condition": {
                "numberMarkedCurrent": { "moreThan": 1 }
            },
            "resultingStatus": "error",
            "resultingMessage": "Multiple current"
        },
        {
            "condition": {
                "hours": { "fromUntil": [22, 8] },
                "not": {
                    "currentTaskHasTime": true,
                    "currentTaskIsOverdue": true
                }
            },
            "resultingStatus": "error",
            "resultingMessage": "Only scheduled tasks at night"
        }
    ],
    "naggingConditions": [
        { "status": "error" },
        { "status": "warning" },
        {
            "or": [
                { "minutes": { "fromUntil": [25, 30] } },
                { "minutes": { "fromUntil": [55, 0] } }
            ]
        },
        {
            "minutes": { "multipleOf": 5 },
            "seconds": { "fromUntil": [0, 15] }
        }
    ],
    "downtimeConditions": [
        { "dayOfWeek": { "anyOf": [0, 6] } }
    ]
}
```

## Development

It's recommended to install dependencies using `npm ci` to avoid any version mismatches.

You can run the app using `npm run start`, which will also generate the JSON Schema used to validate the advanced configuration file. You can also skip this schema generation step by running the app using `npm run start-no-generate`.

The `prepare-make` script defines several checks that should pass for every commit that is made:

-   Code should be formatted according to Prettier code style. This is easy to achieve by using VS Code and installing the recommended Prettier as defined in `.vscode/extensions.json`. The `.vscode/settings.json` file configures VS Code to automatically format files on save. Make sure that you select Prettier as the formatter to use.
-   Code should pass TypeScript type checking. If you use VS Code, it will notify you of errors as you code.
-   All of the unit tests should run successfully.

The `prepare-make` script also generates as fresh JSON Schema for the advanced configuration file. This is used by the unit tests as well as the process that actually builds the application.

If you want to contribute to the development of this application, please review the [contributing guidelines](./CONTRIBUTING.md).
