// src/types/household.test.ts
import { describe, expect, it } from "vitest";
import { HouseholdIdSchema, PersonIdSchema } from "./core";
import { HouseholdSchema, PersonSchema, ProfileSchema } from "./household";

describe("household schemas", () => {
	const householdId = HouseholdIdSchema.parse("household_123");
	const personId = PersonIdSchema.parse("person_456");

	it("validates Person", () => {
		const person = {
			id: personId,
			householdId,
			name: "Alex",
			avatar: null,
			email: "alex@example.com",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		expect(PersonSchema.parse(person)).toEqual(person);
	});

	it("rejects Person with empty name", () => {
		const person = {
			id: personId,
			householdId,
			name: "",
			avatar: null,
			email: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		expect(() => PersonSchema.parse(person)).toThrow();
	});

	it("validates Profile", () => {
		const profile = {
			personId,
			birthDate: "1990-01-15",
			sex: "male" as const,
			height: { value: 180, unit: "cm" as const },
			weight: { value: 75, unit: "kg" as const },
			activityLevel: "moderate" as const,
			goals: ["health" as const, "maintain" as const],
		};
		expect(ProfileSchema.parse(profile)).toEqual(profile);
	});

	it("validates Household", () => {
		const household = {
			id: householdId,
			name: "Smith Family",
			settings: {
				timezone: "America/New_York",
				defaultMealTimes: {
					breakfast: { start: "07:00", end: "09:00" },
					lunch: { start: "12:00", end: "13:30" },
					dinner: { start: "18:00", end: "20:00" },
					snacks: [{ start: "10:30", end: "11:00" }],
				},
				shoppingDay: "sunday" as const,
			},
			memberIds: [personId],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		expect(HouseholdSchema.parse(household)).toEqual(household);
	});
});
