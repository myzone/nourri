// src/stores/household.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the CRDT module before importing store
// Create a fresh Y.Doc inside the factory since vi.mock is hoisted
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

import { useHouseholdStore } from "./household";

describe("useHouseholdStore", () => {
	beforeEach(() => {
		// Reset store state
		useHouseholdStore.setState({
			household: null,
			members: [],
			isLoading: false,
		});
	});

	it("initializes household", () => {
		const { initializeHousehold } = useHouseholdStore.getState();

		const household = initializeHousehold("Test Family", "America/New_York");

		expect(household.name).toBe("Test Family");
		expect(household.settings.timezone).toBe("America/New_York");
		expect(household.id).toMatch(/^household_/);
	});

	it("adds member to household", () => {
		const { initializeHousehold, addMember } = useHouseholdStore.getState();

		initializeHousehold("Test Family", "America/New_York");
		const person = addMember("Alex", "alex@test.com");

		expect(person.name).toBe("Alex");
		expect(person.email).toBe("alex@test.com");
		expect(person.id).toMatch(/^person_/);
	});

	it("throws when adding member without household", () => {
		const { addMember } = useHouseholdStore.getState();

		expect(() => addMember("Alex")).toThrow("No household initialized");
	});
});
