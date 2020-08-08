export interface InternalConfiguration {
    integration?: IntegrationConfiguration;
}

export type IntegrationConfiguration = TaggedTodoistConfiguration;

export interface TaggedTodoistConfiguration extends TodoistConfiguration {
    type: "todoist";
}

export interface TodoistConfiguration {
    token: string;
    labelName: string;
    includeFutureTasksWithLabel: boolean;
}
