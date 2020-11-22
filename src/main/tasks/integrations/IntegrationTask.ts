import { Moment } from "moment";

export interface IntegrationTask {
    title: string;
    dueDate?: string;
    dueDatetime?: Moment;
    markedCurrent: boolean;
}
