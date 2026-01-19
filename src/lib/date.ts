// src/lib/date.ts
import { match } from "ts-pattern";
import type { MealType } from "@/types";

export function formatDate(date: Date): string {
	// Use local date, not UTC
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
	return new Date(`${dateStr}T00:00:00`);
}

export function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	d.setDate(d.getDate() - day);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getWeekDates(startDate: Date): Date[] {
	const dates: Date[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(startDate);
		d.setDate(startDate.getDate() + i);
		dates.push(d);
	}
	return dates;
}

export function formatTime(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

export function getDayName(date: Date, short = false): string {
	return date.toLocaleDateString("en-US", { weekday: short ? "short" : "long" });
}

export function getMonthDay(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isToday(date: Date): boolean {
	const today = new Date();
	return formatDate(date) === formatDate(today);
}

export function isTomorrow(date: Date): boolean {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return formatDate(date) === formatDate(tomorrow);
}

export function getDaysFromToday(date: Date): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const target = new Date(date);
	target.setHours(0, 0, 0, 0);
	return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRelativeDayLabel(date: Date): string {
	const days = getDaysFromToday(date);
	if (days === 0) return "Today";
	if (days === 1) return "Tomorrow";
	if (days === -1) return "Yesterday";
	if (days > 1 && days <= 7) return getDayName(date);
	return getMonthDay(date);
}

export function getMealTypeIcon(mealType: MealType): string {
	return match(mealType)
		.with("breakfast", () => "🍳")
		.with("lunch", () => "🥗")
		.with("dinner", () => "🍽")
		.with("snack", () => "🍎")
		.exhaustive();
}

/** Format hour for display: "8 AM", "12 PM", etc. */
export function formatHour(date: Date): string {
	const hours = date.getHours();
	const hour12 = hours % 12 || 12;
	const ampm = hours >= 12 ? "PM" : "AM";
	return `${hour12} ${ampm}`;
}
