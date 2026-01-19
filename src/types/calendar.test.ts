// src/types/calendar.test.ts
import { describe, expect, it } from "vitest";
import { ActualMealSchema, CookingSlotSchema, MealSlotSchema, ParticipantSchema } from "./calendar";
import { HouseholdIdSchema, MealIdSchema, PersonIdSchema, SlotIdSchema } from "./core";

describe("calendar schemas", () => {
	const householdId = HouseholdIdSchema.parse("household_123");
	const personId = PersonIdSchema.parse("person_456");
	const slotId = SlotIdSchema.parse("slot_789");
	const mealId = MealIdSchema.parse("meal_abc");
	const now = Date.now();

	it("validates Participant", () => {
		const participant = {
			personId,
			status: "confirmed" as const,
			portions: 1,
			respondedAt: now,
		};
		expect(ParticipantSchema.parse(participant)).toEqual(participant);
	});

	it("validates ActualMeal for ate_out", () => {
		const actual = {
			type: "ate_out" as const,
			mealId: null,
			customDescription: "Pizza with friends",
			ateOutVenue: { name: "Joe's Pizza", category: "restaurant" as const },
			roughCategory: "heavy" as const,
			confirmedAt: now,
			confirmedBy: personId,
		};
		expect(ActualMealSchema.parse(actual)).toEqual(actual);
	});

	it("validates CookingSlot", () => {
		const cookingSlot = {
			id: SlotIdSchema.parse("slot_cook"),
			householdId,
			mealSlotId: slotId,
			cookId: personId,
			timing: {
				plannedStart: now,
				plannedEnd: now + 30 * 60 * 1000,
				actualStart: null,
				actualEnd: null,
			},
			mealId,
			createdAt: now,
			updatedAt: now,
		};
		expect(CookingSlotSchema.parse(cookingSlot)).toEqual(cookingSlot);
	});

	it("validates MealSlot", () => {
		const mealSlot = {
			id: slotId,
			householdId,
			date: "2025-01-16",
			mealType: "dinner" as const,
			timing: {
				plannedStart: now,
				plannedEnd: now + 60 * 60 * 1000,
				actualStart: null,
				actualEnd: null,
			},
			participants: [{ personId, status: "confirmed" as const, portions: 1, respondedAt: now }],
			plannedMeal: { mealId, notes: null },
			actualMeal: null,
			cookingSlotId: SlotIdSchema.parse("slot_cook"),
			status: "planned" as const,
			createdAt: now,
			updatedAt: now,
		};
		expect(MealSlotSchema.parse(mealSlot)).toEqual(mealSlot);
	});
});
