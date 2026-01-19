// src/stores/calendar.ts
import { create } from "zustand";
import { cookingSlotsArray, doc, mealSlotsArray } from "@/lib/crdt";
import type { CookingSlot, MealSlot, MealType, Participant, SlotId } from "@/types";
import {
	CookingSlotSchema,
	createId,
	type HouseholdId,
	MealSlotSchema,
	type PersonId,
} from "@/types";

interface CalendarState {
	mealSlots: MealSlot[];
	cookingSlots: CookingSlot[];
	isLoading: boolean;

	// Selectors
	getSlotsForDate: (date: string) => MealSlot[];
	getSlotsForWeek: (startDate: string) => MealSlot[];
	getCookingSlotForMeal: (mealSlotId: SlotId) => CookingSlot | undefined;

	// Actions
	createMealSlot: (params: {
		householdId: HouseholdId;
		date: string;
		mealType: MealType;
		startTime: number;
		endTime: number;
		participants: Participant[];
	}) => MealSlot;

	updateMealSlot: (slotId: SlotId, updates: Partial<MealSlot>) => void;
	deleteMealSlot: (slotId: SlotId) => void;

	createCookingSlot: (params: {
		householdId: HouseholdId;
		mealSlotId: SlotId;
		cookId: PersonId;
		startTime: number;
		endTime: number;
	}) => CookingSlot;

	// Dev helpers
	seedMockData: (slots: MealSlot[]) => void;
	clearAllData: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => {
	// Subscribe to CRDT changes
	const syncFromCrdt = () => {
		const mealSlotsData = mealSlotsArray.toArray();
		const cookingSlotsData = cookingSlotsArray.toArray();

		const mealSlots = mealSlotsData
			.map((s) => MealSlotSchema.safeParse(s))
			.filter((r) => r.success)
			.map((r) => r.data as MealSlot);

		const cookingSlots = cookingSlotsData
			.map((s) => CookingSlotSchema.safeParse(s))
			.filter((r) => r.success)
			.map((r) => r.data as CookingSlot);

		set({ mealSlots, cookingSlots, isLoading: false });
	};

	mealSlotsArray.observe(syncFromCrdt);
	cookingSlotsArray.observe(syncFromCrdt);
	doc.on("load", syncFromCrdt);

	return {
		mealSlots: [],
		cookingSlots: [],
		isLoading: true,

		getSlotsForDate: (date) => {
			return get().mealSlots.filter((s) => s.date === date);
		},

		getSlotsForWeek: (startDate) => {
			const start = new Date(startDate);
			const dates: string[] = [];
			for (let i = 0; i < 7; i++) {
				const d = new Date(start);
				d.setDate(start.getDate() + i);
				const dateStr = d.toISOString().split("T")[0];
				if (dateStr) dates.push(dateStr);
			}
			return get().mealSlots.filter((s) => dates.includes(s.date));
		},

		getCookingSlotForMeal: (mealSlotId) => {
			return get().cookingSlots.find((c) => c.mealSlotId === mealSlotId);
		},

		createMealSlot: ({ householdId, date, mealType, startTime, endTime, participants }) => {
			const now = Date.now();
			const slot: MealSlot = {
				id: createId<SlotId>("slot"),
				householdId,
				date,
				mealType,
				timing: {
					plannedStart: startTime,
					plannedEnd: endTime,
					actualStart: null,
					actualEnd: null,
				},
				participants,
				plannedMeal: null,
				actualMeal: null,
				cookingSlotId: null,
				status: "planned",
				createdAt: now,
				updatedAt: now,
			};

			doc.transact(() => {
				mealSlotsArray.push([slot]);
			});

			return slot;
		},

		updateMealSlot: (slotId, updates) => {
			const { mealSlots } = get();
			const index = mealSlots.findIndex((s) => s.id === slotId);
			if (index === -1) return;

			const updated = {
				...mealSlots[index],
				...updates,
				updatedAt: Date.now(),
			};

			doc.transact(() => {
				mealSlotsArray.delete(index, 1);
				mealSlotsArray.insert(index, [updated]);
			});
		},

		deleteMealSlot: (slotId) => {
			const { mealSlots, cookingSlots } = get();
			const mealIndex = mealSlots.findIndex((s) => s.id === slotId);
			if (mealIndex === -1) return;

			// Also delete associated cooking slot
			const cookingIndex = cookingSlots.findIndex((c) => c.mealSlotId === slotId);

			doc.transact(() => {
				mealSlotsArray.delete(mealIndex, 1);
				if (cookingIndex !== -1) {
					cookingSlotsArray.delete(cookingIndex, 1);
				}
			});
		},

		createCookingSlot: ({ householdId, mealSlotId, cookId, startTime, endTime }) => {
			const { mealSlots } = get();
			const mealSlot = mealSlots.find((s) => s.id === mealSlotId);
			if (!mealSlot) throw new Error("Meal slot not found");

			const now = Date.now();
			const cookingSlot: CookingSlot = {
				id: createId<SlotId>("cooking"),
				householdId,
				mealSlotId,
				cookId,
				timing: {
					plannedStart: startTime,
					plannedEnd: endTime,
					actualStart: null,
					actualEnd: null,
				},
				mealId: mealSlot.plannedMeal?.mealId ?? null,
				createdAt: now,
				updatedAt: now,
			};

			doc.transact(() => {
				cookingSlotsArray.push([cookingSlot]);
				// Update meal slot with cooking slot reference
				const index = mealSlots.findIndex((s) => s.id === mealSlotId);
				if (index !== -1) {
					const updated = { ...mealSlot, cookingSlotId: cookingSlot.id, updatedAt: now };
					mealSlotsArray.delete(index, 1);
					mealSlotsArray.insert(index, [updated]);
				}
			});

			return cookingSlot;
		},

		seedMockData: (slots) => {
			doc.transact(() => {
				// Clear existing
				while (mealSlotsArray.length > 0) {
					mealSlotsArray.delete(0, 1);
				}
				// Add new
				mealSlotsArray.push(slots);
			});
		},

		clearAllData: () => {
			doc.transact(() => {
				while (mealSlotsArray.length > 0) {
					mealSlotsArray.delete(0, 1);
				}
				while (cookingSlotsArray.length > 0) {
					cookingSlotsArray.delete(0, 1);
				}
			});
		},
	};
});
