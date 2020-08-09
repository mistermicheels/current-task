export type IntegrationType = "manual" | "todoist";

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
}
