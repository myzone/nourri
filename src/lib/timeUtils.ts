const MINUTE_MS = 60 * 1000;

/**
 * Round timestamp to nearest interval (in minutes).
 * @param time - timestamp in milliseconds
 * @param intervalMinutes - interval to round to (e.g., 5 for 5-minute increments)
 */
export function roundToInterval(time: number, intervalMinutes: number): number {
	const intervalMs = intervalMinutes * MINUTE_MS;
	return Math.round(time / intervalMs) * intervalMs;
}

/**
 * Check if two time ranges overlap.
 * Adjacent ranges (end1 === start2) do NOT overlap.
 */
export function timesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
	return start1 < end2 && end1 > start2;
}

/**
 * Get the start and end timestamps for the day containing the given timestamp.
 */
export function getDayBounds(time: number): { dayStart: number; dayEnd: number } {
	const date = new Date(time);
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);

	const dayEnd = new Date(date);
	dayEnd.setHours(23, 59, 59, 999);

	return { dayStart: dayStart.getTime(), dayEnd: dayEnd.getTime() };
}
