// src/types/core.test.ts
import { describe, expect, it } from "vitest";
import {
	AmountSchema,
	createId,
	MealTypeSchema,
	QuantityLevelSchema,
	StorageLocationSchema,
} from "./core";

describe("core schemas", () => {
	it("validates Amount", () => {
		const valid = { value: 100, unit: "g" };
		expect(AmountSchema.parse(valid)).toEqual(valid);
	});

	it("rejects invalid Amount", () => {
		expect(() => AmountSchema.parse({ value: "100", unit: "g" })).toThrow();
	});

	it("validates QuantityLevel", () => {
		expect(QuantityLevelSchema.parse("plenty")).toBe("plenty");
		expect(QuantityLevelSchema.parse("out")).toBe("out");
	});

	it("rejects invalid QuantityLevel", () => {
		expect(() => QuantityLevelSchema.parse("empty")).toThrow();
	});

	it("validates StorageLocation", () => {
		expect(StorageLocationSchema.parse("fridge")).toBe("fridge");
	});

	it("validates MealType", () => {
		expect(MealTypeSchema.parse("breakfast")).toBe("breakfast");
		expect(MealTypeSchema.parse("snack")).toBe("snack");
	});

	it("creates prefixed IDs", () => {
		const id = createId("person");
		expect(id).toMatch(/^person_[a-f0-9-]+$/);
	});
});
