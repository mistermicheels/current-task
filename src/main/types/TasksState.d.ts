export interface TasksState {
    numberOverdueWithTime: number;
    numberOverdueWithTimeMarkedCurrent: number;
    numberOverdueWithTimeNotMarkedCurrent: number;
    numberMarkedCurrent: number;
    currentTaskTitle: string;
    currentTaskHasDate: boolean;
    currentTaskHasTime: boolean;
    currentTaskIsOverdue: boolean;
}
