// src/types/household.ts
import { z } from "zod";
import { HouseholdIdSchema, PersonIdSchema } from "./core";

// === Person ===

export const PersonSchema = z.object({
	id: PersonIdSchema,
	householdId: HouseholdIdSchema,
	name: z.string().min(1),
	avatar: z.string().nullable(),
	email: z.string().email().nullable(),
	createdAt: z.number(), // timestamp
	updatedAt: z.number(),
});
export type Person = z.infer<typeof PersonSchema>;

// === Profile ===

export const SexSchema = z.enum(["male", "female", "other"]);

export const ActivityLevelSchema = z.enum([
	"sedentary",
	"light",
	"moderate",
	"active",
	"very_active",
]);

export const GoalSchema = z.enum(["maintain", "lose", "gain", "muscle", "health"]);

export const ProfileSchema = z.object({
	personId: PersonIdSchema,
	birthDate: z.string().nullable(), // ISO date string
	sex: SexSchema.nullable(),
	height: z.object({ value: z.number(), unit: z.enum(["cm", "in"]) }).nullable(),
	weight: z.object({ value: z.number(), unit: z.enum(["kg", "lb"]) }).nullable(),
	activityLevel: ActivityLevelSchema.nullable(),
	goals: z.array(GoalSchema),
});
export type Profile = z.infer<typeof ProfileSchema>;

// === Household ===

export const DefaultMealTimeSchema = z.object({
	start: z.string(), // "HH:MM"
	end: z.string(),
});

export const HouseholdSettingsSchema = z.object({
	timezone: z.string(),
	defaultMealTimes: z.object({
		breakfast: DefaultMealTimeSchema,
		lunch: DefaultMealTimeSchema,
		dinner: DefaultMealTimeSchema,
		snacks: z.array(DefaultMealTimeSchema),
	}),
	shoppingDay: z
		.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])
		.nullable(),
});

export const HouseholdSchema = z.object({
	id: HouseholdIdSchema,
	name: z.string().min(1),
	settings: HouseholdSettingsSchema,
	memberIds: z.array(PersonIdSchema),
	createdAt: z.number(),
	updatedAt: z.number(),
});
export type Household = z.infer<typeof HouseholdSchema>;
