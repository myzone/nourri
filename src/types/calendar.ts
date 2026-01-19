// src/types/calendar.ts
import { z } from "zod";
import {
	HouseholdIdSchema,
	MealIdSchema,
	MealTypeSchema,
	PersonIdSchema,
	SlotIdSchema,
} from "./core";

// === Participant Status ===

export const ParticipantStatusSchema = z.enum([
	"invited",
	"confirmed",
	"declined",
	"eaten",
	"skipped",
]);
export type ParticipantStatus = z.infer<typeof ParticipantStatusSchema>;

export const ParticipantSchema = z.object({
	personId: PersonIdSchema,
	status: ParticipantStatusSchema,
	portions: z.number().positive().default(1),
	respondedAt: z.number().nullable(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

// === Actual Meal (what really happened) ===

export const ActualMealTypeSchema = z.enum([
	"as_planned",
	"modified",
	"substitute",
	"ate_out",
	"skipped",
]);
export type ActualMealType = z.infer<typeof ActualMealTypeSchema>;

export const RoughCategorySchema = z.enum(["light", "medium", "heavy", "indulgent"]);

export const AteOutVenueSchema = z.object({
	name: z.string(),
	category: z.enum(["fast_food", "restaurant", "cafe", "takeout", "other"]),
});

export const ActualMealSchema = z.object({
	type: ActualMealTypeSchema,
	mealId: MealIdSchema.nullable(),
	customDescription: z.string().nullable(),
	ateOutVenue: AteOutVenueSchema.nullable(),
	roughCategory: RoughCategorySchema.nullable(),
	confirmedAt: z.number(),
	confirmedBy: PersonIdSchema,
});
export type ActualMeal = z.infer<typeof ActualMealSchema>;

// === Slot Timing ===

export const SlotTimingSchema = z.object({
	plannedStart: z.number(), // timestamp
	plannedEnd: z.number(),
	actualStart: z.number().nullable(),
	actualEnd: z.number().nullable(),
});
export type SlotTiming = z.infer<typeof SlotTimingSchema>;

// === Cooking Slot ===

export const CookingSlotSchema = z.object({
	id: SlotIdSchema,
	householdId: HouseholdIdSchema,
	mealSlotId: SlotIdSchema, // the meal this cooking is for
	cookId: PersonIdSchema, // who's cooking
	timing: SlotTimingSchema,
	mealId: MealIdSchema.nullable(), // what's being cooked
	createdAt: z.number(),
	updatedAt: z.number(),
});
export type CookingSlot = z.infer<typeof CookingSlotSchema>;

// === Meal Slot ===

export const MealSlotStatusSchema = z.enum(["planned", "confirmed", "skipped", "modified"]);

export const PlannedMealSchema = z.object({
	mealId: MealIdSchema,
	notes: z.string().nullable(),
});

export const MealSlotSchema = z.object({
	id: SlotIdSchema,
	householdId: HouseholdIdSchema,
	date: z.string(), // ISO date "YYYY-MM-DD"
	mealType: MealTypeSchema,
	timing: SlotTimingSchema,
	participants: z.array(ParticipantSchema),
	plannedMeal: PlannedMealSchema.nullable(),
	actualMeal: ActualMealSchema.nullable(),
	cookingSlotId: SlotIdSchema.nullable(),
	status: MealSlotStatusSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});
export type MealSlot = z.infer<typeof MealSlotSchema>;
