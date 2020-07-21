# one-goal

This is an app that helps you to use your screen time in a productive way by focusing on one task or goal at a time.

It integrates with Todoist and requires you to label exactly one task (scheduled for today, overdue or without a date) as the current screen-based task you are working on. It also warns you about tasks scheduled at a specific time in the past if they are not labeled as the current task. Periodically, it checks for tasks set for a date in the future that are marked as current task and removes the label from them (this is useful for recurring tasks).

The UI is an overlay over the Window taskbar, but it transforms into a nag screen based on error/warning state and time.

The app is written using Electron (which explains the amount of memory it uses) and only designed to work on Windows with a taskbar positioned at the bottom of the screen.

Currently, the logic regarding error/warning state and nagging state is hardcoded and some of it is very specific to the workflow I want to use on my personal machine:

-   Only tasks scheduled at a specific time allowed after 19:00
-   Nag screen for 5 minutes leading up to xx:00 and xx:30, nag screen for 15 seconds every 5 minutes

## Ideas for future development

-   Allow configuring downtime, during which the app is inactive
-   Allow configuring the rules used to determine error/warning state and nagging state
    -   This will require extracting some logic from the AppWindow and Todoist classes, setting up a way to configure rules from JSON, ...
    -   It might make sense to use an out-of-the-box JSON-based rules engine like this one: https://www.npmjs.com/package/json-rules-engine (potentially only in the background)
    -   It might make sense to create a very limited custom format, making it easier to maintain compatibility with a potential future configuration UI (something like Joi or JSON schema might be sufficient for validation)
-   Create a configuration UI so non-technical users don't have to dive into a JSON file
-   Create a tray icon so it's possible to kill the app without having to use Task Manager (although forcing the user to use Task Manager could help with self-control)
-   Allow resizing the app when it's in taskbar overlay mode and actually remember that size across nagging state changes and app restarts
