// this represents the part of the Sync API's label format that we care about
export interface TodoistLabel {
    id: number;
    is_deleted: 1 | 0;
    name: string;
}
