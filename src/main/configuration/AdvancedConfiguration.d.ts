import { Condition } from "./Condition";
import { Status } from "./Status";

export interface AdvancedConfiguration {
    requireReasonForDisabling?: boolean;
    forbidClosingFromTray?: boolean;
    resetStateTimersIfSystemIdleForSeconds?: number;

    customStateRules?: CustomStateRule[];
    naggingConditions?: Condition[];
    blinkingConditions?: Condition[];
    downtimeConditions?: Condition[];
}

interface CustomStateRule {
    condition: Condition;
    resultingStatus: Status;
    resultingMessage: string;
}
