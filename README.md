# one-goal

This is an app that helps you to use your screen time in a productive way by focusing on one task or goal at a time.

It integrates with Todoist and requires you to label exactly one task (scheduled for today, overdue or without a date) as the current screen-based task you are working on. Periodically, it checks for tasks set for a date in the future that are marked as current task and removes the label from them (this is useful for recurring tasks).

The UI is an overlay over the Window taskbar, but it transforms into a nag screen based on conditions that can be specified in the configuration file.

The app is written using Electron (which explains the amount of memory it uses) and only tested to work on Windows.

## Configuration

### Configuration file

The configuration file is located at AppData\Roaming\one-goal\config.json. If it's not there, the app will create a placeholder file for you and ask you to fill it.

### Required configuration

In order for the app to work, you need to provide a Todoist token, which you can find in the Todoist web UI under Settings - Integrations - API token. Make sure not to share this token with anyone (don't just show people your configuration file). You also need to specify the name of the Todoist label indicating the current task to focus on.

Basic configuration example:

```
{
    "todoistToken_DO_NOT_SHARE_THIS": "abcdefghijklmnop123456789",
    "todoistLabelName": "Current_screen_task"
}
```

### Optional configuration

Optionally, you can also specify the following additional settings:

-   `customStateRules`: Define custom rules with a condition and the resulting status and message (only the first matching rule will apply)
-   `naggingConditions`: Define when the UI should transform into a nag screen rather than a taskbar overlay
-   `downtimeConditions`: Define when the UI should be hidden, allowing you to do whatever you want without the app bothering you

Full configuration example:

```
{
    "todoistToken_DO_NOT_SHARE_THIS": "abcdefghijklmnop123456789",
    "todoistLabelName": "Current_screen_task",
    "customStateRules": [
        {
            "condition": {
                "numberOverdueWithTimeWithoutLabel": { "moreThan": 0 }
            },
            "resultingStatus": "warning",
            "resultingMessage": "Scheduled task"
        },
        {
            "condition": {
                "numberWithLabel": { "lessThan": 1 }
            },
            "resultingStatus": "error",
            "resultingMessage": "No current task"
        },
        {
            "condition": {
                "numberWithLabel": { "moreThan": 1 }
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

## Ideas for future development

-   Allow resizing the app when it's in taskbar overlay mode and actually remember that size across nagging state changes and app restarts
-   Create a tray icon so it's possible to kill the app without having to use Task Manager (although forcing the user to use Task Manager could help with self-control)
-   Create a configuration UI so non-technical users don't have to dive into a JSON file (it's unlikely that this will be implemented in the near future)
