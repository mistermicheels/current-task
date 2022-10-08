import { Condition } from "./Condition";
import { Status } from "./Status";

export interface AdvancedConfiguration {
    requireReasonForDisabling?: boolean;
    forbidDisabling?: boolean;
    forbidClosingFromTray?: boolean;
    resetStateTimersIfSystemIdleForSeconds?: number;
    clearCurrentIfSystemIdleForSeconds?: number;
    clearCurrentIfDisabled?: boolean;

    calendarUrl?: string;

    customStateRules?: CustomStateRule[];
    naggingConditions?: Condition[];
    blinkingConditions?: Condition[];
    downtimeConditions?: Condition[];
}

interface CustomStateRule {
    condition: Condition;
    resultingStatus: Status;
    resultingMessage: string;
    clearCurrent?: boolean;
}
