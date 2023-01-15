export interface CalendarEvent {
    summary: string;
    location: string;
    start: Date;
    end: Date;
    isAllDay: boolean;
}

export interface CalendarEventWithCalendarName extends CalendarEvent {
    calendar: string;
}
