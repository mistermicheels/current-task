import { Status } from "./Status";

export interface Condition {
    dayOfWeek?: NumericValueCondition;
    hours?: NumericValueCondition;
    minutes?: NumericValueCondition;
    seconds?: NumericValueCondition;
    numberOverdue?: NumericValueCondition;
    numberOverdueMarkedCurrent?: NumericValueCondition;
    numberOverdueNotMarkedCurrent?: NumericValueCondition;
    numberOverdueWithTime?: NumericValueCondition;
    numberOverdueWithTimeMarkedCurrent?: NumericValueCondition;
    numberOverdueWithTimeNotMarkedCurrent?: NumericValueCondition;
    numberScheduledForToday?: NumericValueCondition;
    numberScheduledForTodayMarkedCurrent?: NumericValueCondition;
    numberScheduledForTodayNotMarkedCurrent?: NumericValueCondition;
    numberMarkedCurrent?: NumericValueCondition;
    secondsInCurrentStatus?: NumericValueCondition;
    secondsSinceOkStatus?: NumericValueCondition;
    currentTaskHasDate?: boolean;
    currentTaskHasTime?: boolean;
    currentTaskIsOverdue?: boolean;
    currentTaskIsScheduledForToday?: boolean;
    status?: Status;
    not?: Condition;
    or?: Condition[];
    and?: Condition[];
}

export type ValueCondition = NumericValueCondition | boolean | Status;

type NumericValueCondition = number | NumericValueOperatorsCondition;

export type NumericValueOperatorsCondition = {
    anyOf?: number[];
    lessThan?: number;
    moreThan?: number;
    multipleOf?: number;
    fromUntil?: [number, number];
};
