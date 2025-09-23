import { eachDayOfInterval, isWeekend as dfIsWeekend, parseISO } from 'date-fns';
import { toZonedTime, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

const TZ = process.env.TIMEZONE || 'Asia/Kuala_Lumpur';

/** ISO "yyyy-MM-dd" for today's date in TZ */
export function todayISO(): string {
    const now = toZonedTime(new Date(), TZ);
    return formatInTimeZone(now, TZ, 'yyyy-MM-dd');
}

/** Weekends: default Sat/Sun; override for regions using Fri/Sat, etc. */
export type Weekend = { days: number[] }; // JS getDay(): 0=Sun..6=Sat
const DEFAULT_WEEKEND: Weekend = { days: [0, 6] };

/** Public holidays as ISO yyyy-MM-dd strings (in TZ) */
export type Holidays = Set<string>;

/** Helper: is the date a weekend under the given policy? */
function isWeekend(date: Date, weekend: Weekend = DEFAULT_WEEKEND) {
    return weekend.days.includes(date.getDay());
}

/** Helper: convert Date to ISO yyyy-MM-dd *in TZ* */
function toISOInTZ(d: Date): string {
    return formatInTimeZone(d, TZ, 'yyyy-MM-dd');
}

/**
 * Count working days inclusive between start and end (ISO yyyy-MM-dd).
 * - Excludes weekends (configurable)
 * - Optionally excludes public holidays (ISO strings)
 * - If clampMin1=true, returns at least 1 when any weekday is selected
 */
export function workingDaysInclusive(
    startISO: string,
    endISO: string,
    opts?: {
        weekend?: Weekend;
        holidays?: Holidays;
        clampMin1?: boolean;
    }
): number {
    const weekend = opts?.weekend ?? DEFAULT_WEEKEND;
    const holidays = opts?.holidays;
    const clampMin1 = opts?.clampMin1 ?? false;

    // Parse as local date at midnight in TZ to avoid DST/offset surprises
    // by interpreting the ISO as midnight UTC then shifting into TZ:
    const start = utcToZonedTime(new Date(`${startISO}T00:00:00Z`), TZ);
    const end = utcToZonedTime(new Date(`${endISO}T00:00:00Z`), TZ);

    // Swap if reversed
    const rangeStart = start > end ? end : start;
    const rangeEnd = start > end ? start : end;

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    let count = 0;
    for (const d of days) {
        if (isWeekend(d, weekend)) continue;
        if (holidays && holidays.has(toISOInTZ(d))) continue;
        count++;
    }

    if (clampMin1) count = Math.max(count, 1);
    return count;
}

/** Example: build a Malaysia-holidays set (you can populate from API/DB later) */
export function buildHolidaySet(dates: string[]): Holidays {
    return new Set(dates);
}
