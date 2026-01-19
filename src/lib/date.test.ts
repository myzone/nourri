// src/lib/date.test.ts
import { describe, expect, it } from "vitest";
import {
	formatDate,
	formatTime,
	getDayName,
	getMealTypeIcon,
	getMonthDay,
	getWeekDates,
	getWeekStart,
	isToday,
	parseDate,
} from "./date";

describe("date utilities", () => {
	it("formats date to ISO string", () => {
		const date = new Date("2025-01-16T12:00:00");
		expect(formatDate(date)).toBe("2025-01-16");
	});

	it("parses date string", () => {
		const date = parseDate("2025-01-16");
		expect(date.getFullYear()).toBe(2025);
		expect(date.getMonth()).toBe(0); // January
		expect(date.getDate()).toBe(16);
	});

	it("gets week start (Sunday)", () => {
		const thursday = new Date("2025-01-16T12:00:00"); // Thursday
		const sunday = getWeekStart(thursday);
		expect(sunday.getDay()).toBe(0); // Sunday
		expect(formatDate(sunday)).toBe("2025-01-12");
	});

	it("gets all week dates", () => {
		const sunday = new Date("2025-01-12T12:00:00");
		const dates = getWeekDates(sunday);
		expect(dates).toHaveLength(7);
		const firstDate = dates[0];
		const lastDate = dates[6];
		expect(firstDate).toBeDefined();
		expect(lastDate).toBeDefined();
		expect(formatDate(firstDate as Date)).toBe("2025-01-12"); // Sunday
		expect(formatDate(lastDate as Date)).toBe("2025-01-18"); // Saturday
	});

	it("formats time", () => {
		const timestamp = new Date("2025-01-16T18:30:00").getTime();
		expect(formatTime(timestamp)).toMatch(/6:30\s?PM/i);
	});

	it("gets day name", () => {
		const thursday = new Date("2025-01-16T12:00:00");
		expect(getDayName(thursday)).toBe("Thursday");
		expect(getDayName(thursday, true)).toBe("Thu");
	});

	it("gets month and day", () => {
		const date = new Date("2025-01-16T12:00:00");
		expect(getMonthDay(date)).toBe("Jan 16");
	});

	it("checks if date is today", () => {
		const today = new Date();
		expect(isToday(today)).toBe(true);

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		expect(isToday(yesterday)).toBe(false);
	});

	it("gets meal type icons", () => {
		expect(getMealTypeIcon("breakfast")).toBe("🍳");
		expect(getMealTypeIcon("dinner")).toBe("🍽");
	});
});
