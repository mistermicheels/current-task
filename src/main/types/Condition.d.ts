import { Status } from "./Status";

export interface Condition {
    dayOfWeek?: NumericValueCondition;
    hours?: NumericValueCondition;
    minutes?: NumericValueCondition;
    seconds?: NumericValueCondition;
    numberOverdueWithTime?: NumericValueCondition;
    numberOverdueWithTimeAndLabel?: NumericValueCondition;
    numberOverdueWithTimeWithoutLabel?: NumericValueCondition;
    numberWithLabel?: NumericValueCondition;
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
