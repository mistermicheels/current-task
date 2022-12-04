export interface CalendarEvent {
    summary: string;
    location: string;
    start: Date;
    end: Date;
}

export interface CalendarEventWithCalendarName extends CalendarEvent {
    calendar: string;
}
