import { Condition } from "../ConditionMatcher";
import { Status } from "./Status";

export interface Configuration {
    todoistToken: string;
    todoistLabelName: string;
    includeFutureTasksWithLabel?: boolean;
    forbidClosingFromTray?: boolean;
    customStateRules?: CustomStateRule[];
    naggingConditions?: Condition[];
    downtimeConditions?: Condition[];
}

interface CustomStateRule {
    condition: Condition;
    resultingStatus: Status;
    resultingMessage: string;
}
