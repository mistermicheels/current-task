import { Moment } from "moment";

export interface TaskData {
    title: string;
    dueDate?: string;
    dueDatetime?: Moment;
    markedCurrent: boolean;
}
