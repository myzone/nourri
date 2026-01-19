// src/types/core.ts
import { z } from "zod";

// === Primitives ===

export const AmountSchema = z.object({
	value: z.number(),
	unit: z.string(),
});
export type Amount = z.infer<typeof AmountSchema>;

export const QuantityLevelSchema = z.enum(["plenty", "some", "low", "out"]);
export type QuantityLevel = z.infer<typeof QuantityLevelSchema>;

export const StorageLocationSchema = z.enum(["fridge", "freezer", "pantry", "counter"]);
export type StorageLocation = z.infer<typeof StorageLocationSchema>;

export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

// === IDs (branded strings for type safety) ===

export const HouseholdIdSchema = z.string().brand<"HouseholdId">();
export type HouseholdId = z.infer<typeof HouseholdIdSchema>;

export const PersonIdSchema = z.string().brand<"PersonId">();
export type PersonId = z.infer<typeof PersonIdSchema>;

export const MealIdSchema = z.string().brand<"MealId">();
export type MealId = z.infer<typeof MealIdSchema>;

export const IngredientIdSchema = z.string().brand<"IngredientId">();
export type IngredientId = z.infer<typeof IngredientIdSchema>;

export const SlotIdSchema = z.string().brand<"SlotId">();
export type SlotId = z.infer<typeof SlotIdSchema>;

// === Helpers ===

export function createId<T extends string>(prefix: string): T {
	return `${prefix}_${crypto.randomUUID()}` as T;
}
