import { describe, expect, it } from "vitest";
import { getDayBounds, roundToInterval, timesOverlap } from "./timeUtils";

describe("roundToInterval", () => {
	it("rounds down to nearest 5 minutes", () => {
		// 10:02 AM -> 10:00 AM
		const time = new Date("2026-01-17T10:02:00").getTime();
		const rounded = roundToInterval(time, 5);
		expect(new Date(rounded).getMinutes()).toBe(0);
	});

	it("rounds up when past halfway", () => {
		// 10:03 AM -> 10:05 AM
		const time = new Date("2026-01-17T10:03:00").getTime();
		const rounded = roundToInterval(time, 5);
		expect(new Date(rounded).getMinutes()).toBe(5);
	});
});

describe("timesOverlap", () => {
	const base = new Date("2026-01-17T10:00:00").getTime();
	const hour = 60 * 60 * 1000;

	it("returns true for overlapping ranges", () => {
		// 10:00-11:00 overlaps with 10:30-11:30
		expect(timesOverlap(base, base + hour, base + hour / 2, base + hour * 1.5)).toBe(true);
	});

	it("returns false for non-overlapping ranges", () => {
		// 10:00-11:00 does not overlap with 12:00-13:00
		expect(timesOverlap(base, base + hour, base + hour * 2, base + hour * 3)).toBe(false);
	});

	it("returns false for adjacent ranges", () => {
		// 10:00-11:00 does not overlap with 11:00-12:00 (touching is ok)
		expect(timesOverlap(base, base + hour, base + hour, base + hour * 2)).toBe(false);
	});
});

describe("getDayBounds", () => {
	it("returns start and end of day for timestamp", () => {
		const time = new Date("2026-01-17T14:30:00").getTime();
		const { dayStart, dayEnd } = getDayBounds(time);

		expect(new Date(dayStart).getHours()).toBe(0);
		expect(new Date(dayStart).getMinutes()).toBe(0);
		expect(new Date(dayEnd).getHours()).toBe(23);
		expect(new Date(dayEnd).getMinutes()).toBe(59);
	});
});
