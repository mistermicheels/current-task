// this represents the part of the Sync API's item (= task) format that we care about
export interface TodoistTask {
    checked: boolean;
    content: string;

    due: {
        /** example values: 2016-12-01, 2016-12-0T12:00:00 (local time, no timezone specified), 2016-12-06T13:00:00Z */
        date: string;
    } | null;

    id: string;
    is_deleted: boolean;

    /** array of label names (rather than IDs) */
    labels: string[];

    parent_id: string | null;
}
