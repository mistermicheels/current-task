import { Status } from "./Status";

export interface Condition {
    dayOfWeek?: NumericValueCondition;
    hours?: NumericValueCondition;
    minutes?: NumericValueCondition;
    seconds?: NumericValueCondition;
    numberOverdueWithTime?: NumericValueCondition;
    numberOverdueWithTimeMarkedCurrent?: NumericValueCondition;
    numberOverdueWithTimeNotMarkedCurrent?: NumericValueCondition;
    numberMarkedCurrent?: NumericValueCondition;
    currentTaskHasDate?: boolean;
    currentTaskHasTime?: boolean;
    currentTaskIsOverdue?: boolean;
    status?: Status;
    not?: Condition;
    or?: Condition[];
}

export type ValueCondition = NumericValueCondition | boolean | Status;

type NumericValueCondition =
    | number
    | { anyOf: number[] }
    | { lessThan: number }
    | { moreThan: number }
    | { multipleOf: number }
    | { fromUntil: [number, number] };
