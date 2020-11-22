// this represents the part of the Sync API's item (= task) format that we care about
export interface TodoistTask {
    checked: 1 | 0;
    content: string;

    due: {
        /** example values: 2016-12-01, 2016-12-0T12:00:00 (local time, no timezone specified), 2016-12-06T13:00:00Z */
        date: string;
    } | null;

    id: number;
    is_deleted: 1 | 0;
    labels: number[];
    parent_id: number | null;
}
