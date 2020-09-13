export interface TasksState {
    numberOverdue: number;
    numberOverdueMarkedCurrent: number;
    numberOverdueNotMarkedCurrent: number;
    numberOverdueWithTime: number;
    numberOverdueWithTimeMarkedCurrent: number;
    numberOverdueWithTimeNotMarkedCurrent: number;
    numberScheduledForToday: number;
    numberScheduledForTodayMarkedCurrent: number;
    numberScheduledForTodayNotMarkedCurrent: number;
    numberMarkedCurrent: number;
    currentTaskTitle: string;
    currentTaskHasDate: boolean;
    currentTaskHasTime: boolean;
    currentTaskIsOverdue: boolean;
    currentTaskIsScheduledForToday: boolean;
}
