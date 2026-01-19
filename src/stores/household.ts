// src/stores/household.ts
import { create } from "zustand";
import { doc, householdMap, membersArray } from "@/lib/crdt";
import type { Household, Person } from "@/types";
import { createId, type HouseholdId, HouseholdSchema, type PersonId, PersonSchema } from "@/types";

interface HouseholdState {
	household: Household | null;
	members: Person[];
	isLoading: boolean;

	// Actions
	initializeHousehold: (name: string, timezone: string) => Household;
	addMember: (name: string, email?: string) => Person;
	updateMember: (personId: PersonId, updates: Partial<Person>) => void;
	removeMember: (personId: PersonId) => void;
}

export const useHouseholdStore = create<HouseholdState>((set, get) => {
	// Subscribe to CRDT changes
	const syncFromCrdt = () => {
		const householdData = householdMap.get("current");
		const membersData = membersArray.toArray();

		const household = householdData ? HouseholdSchema.safeParse(householdData) : null;
		const members = membersData
			.map((m) => PersonSchema.safeParse(m))
			.filter((r) => r.success)
			.map((r) => r.data as Person);

		set({
			household: household?.success ? household.data : null,
			members,
			isLoading: false,
		});
	};

	// Listen for changes
	householdMap.observe(syncFromCrdt);
	membersArray.observe(syncFromCrdt);

	// Initial sync after CRDT loads
	doc.on("load", syncFromCrdt);

	return {
		household: null,
		members: [],
		isLoading: true,

		initializeHousehold: (name, timezone) => {
			const now = Date.now();
			const household: Household = {
				id: createId<HouseholdId>("household"),
				name,
				settings: {
					timezone,
					defaultMealTimes: {
						breakfast: { start: "07:00", end: "09:00" },
						lunch: { start: "12:00", end: "13:30" },
						dinner: { start: "18:00", end: "20:00" },
						snacks: [],
					},
					shoppingDay: null,
				},
				memberIds: [],
				createdAt: now,
				updatedAt: now,
			};

			doc.transact(() => {
				householdMap.set("current", household);
			});

			return household;
		},

		addMember: (name, email) => {
			const { household } = get();
			if (!household) throw new Error("No household initialized");

			const now = Date.now();
			const person: Person = {
				id: createId<PersonId>("person"),
				householdId: household.id,
				name,
				avatar: null,
				email: email ?? null,
				createdAt: now,
				updatedAt: now,
			};

			doc.transact(() => {
				membersArray.push([person]);
				const updatedHousehold = {
					...household,
					memberIds: [...household.memberIds, person.id],
					updatedAt: now,
				};
				householdMap.set("current", updatedHousehold);
			});

			return person;
		},

		updateMember: (personId, updates) => {
			const { members } = get();
			const index = members.findIndex((m) => m.id === personId);
			if (index === -1) return;

			const updated = {
				...members[index],
				...updates,
				updatedAt: Date.now(),
			};

			doc.transact(() => {
				membersArray.delete(index, 1);
				membersArray.insert(index, [updated]);
			});
		},

		removeMember: (personId) => {
			const { household, members } = get();
			if (!household) return;

			const index = members.findIndex((m) => m.id === personId);
			if (index === -1) return;

			doc.transact(() => {
				membersArray.delete(index, 1);
				const updatedHousehold = {
					...household,
					memberIds: household.memberIds.filter((id) => id !== personId),
					updatedAt: Date.now(),
				};
				householdMap.set("current", updatedHousehold);
			});
		},
	};
});
