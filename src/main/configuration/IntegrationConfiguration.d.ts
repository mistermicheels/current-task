export type IntegrationType = "manual" | "todoist" | "trello";

export interface IntegrationConfiguration<T extends IntegrationType> {
    type: T;
}

export interface ManualIntegrationConfiguration extends IntegrationConfiguration<"manual"> {
    type: "manual";
}

export interface TodoistIntegrationConfiguration extends IntegrationConfiguration<"todoist"> {
    type: "todoist";
    token?: string;
    labelName?: string;
    includeFutureTasksWithLabel?: boolean;
    mergeSubtasksWithParent?: boolean;
}

export interface TrelloIntegrationConfiguration extends IntegrationConfiguration<"trello"> {
    type: "trello";
    key?: string;
    token?: string;
    labelName?: string;
    boards?: string[];
}
