export interface TasksState {
    numberOverdueWithTime: number;
    numberOverdueWithTimeAndLabel: number;
    numberOverdueWithTimeWithoutLabel: number;
    numberWithLabel: number;
    currentTaskTitle: string;
    currentTaskHasDate: boolean;
    currentTaskHasTime: boolean;
    currentTaskIsOverdue: boolean;
}
