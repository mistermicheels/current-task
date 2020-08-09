import { Condition } from "../main/ConditionMatcher";
import { Status } from "./Status";

export interface AdvancedConfiguration {
    requireReasonForDisabling?: boolean;
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
