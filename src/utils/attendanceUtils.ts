import { isWeekend, eachDayOfInterval, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

/**
 * Calculates the number of working days between two dates, 
 * excluding weekends and a list of specific holiday dates.
 */
export function calculateWorkingDays(
    startDate: Date,
    endDate: Date,
    holidays: string[] = [], // Array of ISO date strings (YYYY-MM-DD)
    excludeWeekends: boolean = true,
    specialDates: string[] = [], // Days where school worked despite being a holiday/weekend
    announcementHolidays: string[] = [] // Days declared as holiday via announcement
): number {
    if (isAfter(startDate, endDate)) return 0;

    // Ensure we don't calculate future days as working days for attendance
    const effectiveEnd = isAfter(endDate, new Date()) ? new Date() : endDate;
    if (isAfter(startDate, effectiveEnd)) return 0;

    const days = eachDayOfInterval({
        start: startOfDay(startDate),
        end: endOfDay(effectiveEnd),
    });

    return days.filter(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        // 1. Check if it's a Special Working Day (Overrides everything)
        if (specialDates.includes(dateStr)) return true;

        // 2. Check for Holidays (Calendar Events OR Announcements)
        const isCalendarHoliday = holidays.includes(dateStr);
        const isAnnouncementHoliday = announcementHolidays.includes(dateStr);

        if (isCalendarHoliday || isAnnouncementHoliday) return false;

        if (excludeWeekends) {
            // User: "except saturday, sunday" -> Both are weekends = non-working
            const isWeekendDay = isWeekend(day);
            // NOTE: date-fns matches Saturday(6) and Sunday(0) as weekend.
            if (isWeekendDay) return false;
        }

        return true;
    }).length;
}

/**
 * Calculates attendance percentage based on present count and total working days.
 */
export function calculateAttendancePercentage(
    presentCount: number,
    workingDays: number
): string {
    if (workingDays <= 0) return '0%';
    const percentage = (presentCount / workingDays) * 100;
    return `${Math.min(100, Math.round(percentage))}%`;
}
