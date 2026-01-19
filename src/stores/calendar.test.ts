// src/stores/calendar.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HouseholdId, PersonId } from "@/types";

// Mock CRDT module before importing store
vi.mock("@/lib/crdt", async () => {
	const YModule = await import("yjs");
	const doc = new YModule.Doc();
	return {
		doc,
		householdMap: doc.getMap("household"),
		membersArray: doc.getArray("members"),
		profilesMap: doc.getMap("profiles"),
		mealSlotsArray: doc.getArray("mealSlots"),
		cookingSlotsArray: doc.getArray("cookingSlots"),
		getMap: (name: string) => doc.getMap(name),
		getArray: (name: string) => doc.getArray(name),
		persistence: { on: vi.fn() },
	};
});

import { cookingSlotsArray, mealSlotsArray } from "@/lib/crdt";
import { useCalendarStore } from "./calendar";

describe("useCalendarStore", () => {
	const householdId = "household_test" as HouseholdId;
	const personId = "person_test" as PersonId;

	beforeEach(() => {
		// Clear CRDT arrays
		mealSlotsArray.delete(0, mealSlotsArray.length);
		cookingSlotsArray.delete(0, cookingSlotsArray.length);

		useCalendarStore.setState({
			mealSlots: [],
			cookingSlots: [],
			isLoading: false,
		});
	});

	it("creates meal slot", () => {
		const { createMealSlot } = useCalendarStore.getState();
		const now = Date.now();

		const slot = createMealSlot({
			householdId,
			date: "2025-01-16",
			mealType: "dinner",
			startTime: now,
			endTime: now + 60 * 60 * 1000,
			participants: [{ personId, status: "confirmed", portions: 1, respondedAt: now }],
		});

		expect(slot.id).toMatch(/^slot_/);
		expect(slot.date).toBe("2025-01-16");
		expect(slot.mealType).toBe("dinner");
	});

	it("gets slots for date", () => {
		const { createMealSlot } = useCalendarStore.getState();
		const now = Date.now();

		createMealSlot({
			householdId,
			date: "2025-01-16",
			mealType: "breakfast",
			startTime: now,
			endTime: now + 60 * 60 * 1000,
			participants: [],
		});

		createMealSlot({
			householdId,
			date: "2025-01-16",
			mealType: "dinner",
			startTime: now,
			endTime: now + 60 * 60 * 1000,
			participants: [],
		});

		createMealSlot({
			householdId,
			date: "2025-01-17",
			mealType: "lunch",
			startTime: now,
			endTime: now + 60 * 60 * 1000,
			participants: [],
		});

		// Use the selector to verify filtering
		const { getSlotsForDate } = useCalendarStore.getState();
		const slots = getSlotsForDate("2025-01-16");
		expect(slots.length).toBe(2);
	});
});
