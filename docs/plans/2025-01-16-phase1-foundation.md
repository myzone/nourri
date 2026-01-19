# Phase 1: Data Model & Calendar Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish zod schemas for all core types and build the calendar UI shell with week/day views.

**Architecture:** Type-safe schemas with zod for runtime validation. CRDT-backed store using Yjs maps synced to Zustand for React reactivity. Calendar is the primary UI showing meal and cooking slots.

**Tech Stack:** zod (schemas), Yjs (CRDT), Zustand (React state), TanStack Router, Tailwind v4, ts-pattern (matching)

**Reference:** `specs/2025-01-16-nourri-product-design.md`

---

## Task 1: Core Type Schemas

**Files:**
- Create: `src/types/core.ts`
- Test: `src/types/core.test.ts`

**Step 1: Create the core schemas file**

```typescript
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
```

**Step 2: Create test file**

```typescript
// src/types/core.test.ts
import { describe, expect, it } from "vitest";
import {
	AmountSchema,
	MealTypeSchema,
	QuantityLevelSchema,
	StorageLocationSchema,
	createId,
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
```

**Step 3: Run tests**

```bash
bun test src/types/core.test.ts
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/types/core.ts src/types/core.test.ts
rm src/types/.gitkeep
git add src/types/.gitkeep
git commit -m "feat(types): add core primitive schemas"
```

---

## Task 2: Person & Household Schemas

**Files:**
- Create: `src/types/household.ts`
- Test: `src/types/household.test.ts`

**Step 1: Create household schemas**

```typescript
// src/types/household.ts
import { z } from "zod";
import { HouseholdIdSchema, MealTypeSchema, PersonIdSchema } from "./core";

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
```

**Step 2: Create test file**

```typescript
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
```

**Step 3: Run tests**

```bash
bun test src/types/household.test.ts
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/types/household.ts src/types/household.test.ts
git commit -m "feat(types): add person and household schemas"
```

---

## Task 3: Calendar Slot Schemas

**Files:**
- Create: `src/types/calendar.ts`
- Test: `src/types/calendar.test.ts`

**Step 1: Create calendar schemas**

```typescript
// src/types/calendar.ts
import { z } from "zod";
import { HouseholdIdSchema, MealIdSchema, MealTypeSchema, PersonIdSchema, SlotIdSchema } from "./core";

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
```

**Step 2: Create test file**

```typescript
// src/types/calendar.test.ts
import { describe, expect, it } from "vitest";
import { HouseholdIdSchema, MealIdSchema, PersonIdSchema, SlotIdSchema } from "./core";
import {
	ActualMealSchema,
	CookingSlotSchema,
	MealSlotSchema,
	ParticipantSchema,
} from "./calendar";

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
			participants: [
				{ personId, status: "confirmed" as const, portions: 1, respondedAt: now },
			],
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
```

**Step 3: Run tests**

```bash
bun test src/types/calendar.test.ts
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/types/calendar.ts src/types/calendar.test.ts
git commit -m "feat(types): add calendar slot schemas"
```

---

## Task 4: Types Index Export

**Files:**
- Create: `src/types/index.ts`

**Step 1: Create barrel export**

```typescript
// src/types/index.ts
export * from "./core";
export * from "./household";
export * from "./calendar";
```

**Step 2: Run all type tests**

```bash
bun test src/types/
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add index barrel export"
```

---

## Task 5: CRDT Store Structure

**Files:**
- Modify: `src/lib/crdt.ts`
- Create: `src/stores/household.ts`
- Test: `src/stores/household.test.ts`

**Step 1: Enhance CRDT helpers**

```typescript
// src/lib/crdt.ts
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export const doc = new Y.Doc();

export const persistence = new IndexeddbPersistence("nourri", doc);

persistence.on("synced", () => {
	console.log("CRDT synced with IndexedDB");
});

export function getMap<T>(name: string): Y.Map<T> {
	return doc.getMap<T>(name);
}

export function getArray<T>(name: string): Y.Array<T> {
	return doc.getArray<T>(name);
}

// === Store bindings ===

export const householdMap = getMap<unknown>("household");
export const membersArray = getArray<unknown>("members");
export const profilesMap = getMap<unknown>("profiles");
export const mealSlotsArray = getArray<unknown>("mealSlots");
export const cookingSlotsArray = getArray<unknown>("cookingSlots");
```

**Step 2: Create household store**

```typescript
// src/stores/household.ts
import { create } from "zustand";
import { householdMap, membersArray, doc } from "@/lib/crdt";
import type { Household, Person, Profile } from "@/types";
import { HouseholdSchema, PersonSchema } from "@/types";
import { createId, type HouseholdId, type PersonId } from "@/types";

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
```

**Step 3: Create test file**

```typescript
// src/stores/household.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

// Mock the CRDT module before importing store
vi.mock("@/lib/crdt", () => {
	const doc = new Y.Doc();
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
```

**Step 4: Run tests**

```bash
bun test src/stores/household.test.ts
```

Expected: All tests pass

**Step 5: Remove old store gitkeep and commit**

```bash
rm src/stores/.gitkeep 2>/dev/null || true
git add src/lib/crdt.ts src/stores/household.ts src/stores/household.test.ts
git commit -m "feat(stores): add CRDT-backed household store"
```

---

## Task 6: Calendar Store

**Files:**
- Create: `src/stores/calendar.ts`
- Test: `src/stores/calendar.test.ts`

**Step 1: Create calendar store**

```typescript
// src/stores/calendar.ts
import { create } from "zustand";
import { cookingSlotsArray, doc, mealSlotsArray } from "@/lib/crdt";
import type { CookingSlot, MealSlot, MealType, Participant, SlotId } from "@/types";
import { CookingSlotSchema, MealSlotSchema, createId, type HouseholdId, type PersonId } from "@/types";

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
				dates.push(d.toISOString().split("T")[0]!);
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
	};
});
```

**Step 2: Create test file**

```typescript
// src/stores/calendar.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { HouseholdId, PersonId } from "@/types";

// Mock CRDT
vi.mock("@/lib/crdt", () => {
	const doc = new Y.Doc();
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

import { useCalendarStore } from "./calendar";

describe("useCalendarStore", () => {
	const householdId = "household_test" as HouseholdId;
	const personId = "person_test" as PersonId;

	beforeEach(() => {
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
		const { createMealSlot, getSlotsForDate } = useCalendarStore.getState();
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

		// Need to manually sync state since we're not going through CRDT observer in tests
		const state = useCalendarStore.getState();
		const slots = state.mealSlots.filter((s) => s.date === "2025-01-16");
		expect(slots.length).toBe(2);
	});
});
```

**Step 3: Run tests**

```bash
bun test src/stores/calendar.test.ts
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/stores/calendar.ts src/stores/calendar.test.ts
git commit -m "feat(stores): add CRDT-backed calendar store"
```

---

## Task 7: Date Utilities

**Files:**
- Create: `src/lib/date.ts`
- Test: `src/lib/date.test.ts`

**Step 1: Create date utilities**

```typescript
// src/lib/date.ts
import { match } from "ts-pattern";
import type { MealType } from "@/types";

export function formatDate(date: Date): string {
	return date.toISOString().split("T")[0]!;
}

export function parseDate(dateStr: string): Date {
	return new Date(dateStr + "T00:00:00");
}

export function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	d.setDate(d.getDate() - day);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getWeekDates(startDate: Date): Date[] {
	const dates: Date[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(startDate);
		d.setDate(startDate.getDate() + i);
		dates.push(d);
	}
	return dates;
}

export function formatTime(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

export function formatTimeRange(start: number, end: number): string {
	return `${formatTime(start)} – ${formatTime(end)}`;
}

export function getDayName(date: Date, short = false): string {
	return date.toLocaleDateString("en-US", { weekday: short ? "short" : "long" });
}

export function getMonthDay(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isToday(date: Date): boolean {
	const today = new Date();
	return formatDate(date) === formatDate(today);
}

export function getMealTypeIcon(mealType: MealType): string {
	return match(mealType)
		.with("breakfast", () => "🍳")
		.with("lunch", () => "🥗")
		.with("dinner", () => "🍽")
		.with("snack", () => "🍎")
		.exhaustive();
}

export function getMealTypeLabel(mealType: MealType): string {
	return match(mealType)
		.with("breakfast", () => "Breakfast")
		.with("lunch", () => "Lunch")
		.with("dinner", () => "Dinner")
		.with("snack", () => "Snack")
		.exhaustive();
}
```

**Step 2: Create test file**

```typescript
// src/lib/date.test.ts
import { describe, expect, it } from "vitest";
import {
	formatDate,
	formatTime,
	getDayName,
	getMealTypeIcon,
	getMonthDay,
	getWeekDates,
	getWeekStart,
	isToday,
	parseDate,
} from "./date";

describe("date utilities", () => {
	it("formats date to ISO string", () => {
		const date = new Date("2025-01-16T12:00:00");
		expect(formatDate(date)).toBe("2025-01-16");
	});

	it("parses date string", () => {
		const date = parseDate("2025-01-16");
		expect(date.getFullYear()).toBe(2025);
		expect(date.getMonth()).toBe(0); // January
		expect(date.getDate()).toBe(16);
	});

	it("gets week start (Sunday)", () => {
		const thursday = new Date("2025-01-16"); // Thursday
		const sunday = getWeekStart(thursday);
		expect(sunday.getDay()).toBe(0); // Sunday
		expect(formatDate(sunday)).toBe("2025-01-12");
	});

	it("gets all week dates", () => {
		const sunday = new Date("2025-01-12");
		const dates = getWeekDates(sunday);
		expect(dates).toHaveLength(7);
		expect(formatDate(dates[0]!)).toBe("2025-01-12"); // Sunday
		expect(formatDate(dates[6]!)).toBe("2025-01-18"); // Saturday
	});

	it("formats time", () => {
		const timestamp = new Date("2025-01-16T18:30:00").getTime();
		expect(formatTime(timestamp)).toMatch(/6:30\s?PM/i);
	});

	it("gets day name", () => {
		const thursday = new Date("2025-01-16");
		expect(getDayName(thursday)).toBe("Thursday");
		expect(getDayName(thursday, true)).toBe("Thu");
	});

	it("gets month and day", () => {
		const date = new Date("2025-01-16");
		expect(getMonthDay(date)).toBe("Jan 16");
	});

	it("checks if date is today", () => {
		const today = new Date();
		expect(isToday(today)).toBe(true);

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		expect(isToday(yesterday)).toBe(false);
	});

	it("gets meal type icons", () => {
		expect(getMealTypeIcon("breakfast")).toBe("🍳");
		expect(getMealTypeIcon("dinner")).toBe("🍽");
	});
});
```

**Step 3: Run tests**

```bash
bun test src/lib/date.test.ts
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat(lib): add date utilities"
```

---

## Task 8: Calendar Week View Component

**Files:**
- Create: `src/components/calendar/WeekView.tsx`
- Create: `src/components/calendar/DayColumn.tsx`
- Create: `src/components/calendar/index.ts`

**Step 1: Create DayColumn component**

```typescript
// src/components/calendar/DayColumn.tsx
import { cn } from "@/lib/utils";
import { formatDate, getDayName, getMonthDay, isToday } from "@/lib/date";
import type { MealSlot } from "@/types";
import { MealSlotCard } from "./MealSlotCard";

interface DayColumnProps {
	date: Date;
	slots: MealSlot[];
	onSlotClick?: (slot: MealSlot) => void;
	onEmptyClick?: (date: Date) => void;
}

export function DayColumn({ date, slots, onSlotClick, onEmptyClick }: DayColumnProps) {
	const today = isToday(date);

	// Sort slots by time
	const sortedSlots = [...slots].sort((a, b) => a.timing.plannedStart - b.timing.plannedStart);

	return (
		<div
			className={cn(
				"flex flex-col border-r border-neutral-800 last:border-r-0",
				today && "bg-neutral-900/50"
			)}
		>
			{/* Day header */}
			<div
				className={cn(
					"sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950 px-2 py-3 text-center",
					today && "bg-neutral-900"
				)}
			>
				<div className={cn("text-xs uppercase tracking-wide", today ? "text-blue-400" : "text-neutral-500")}>
					{getDayName(date, true)}
				</div>
				<div className={cn("text-lg font-semibold", today ? "text-blue-400" : "text-neutral-200")}>
					{getMonthDay(date)}
				</div>
			</div>

			{/* Slots */}
			<div
				className="flex flex-1 flex-col gap-2 p-2"
				onClick={() => onEmptyClick?.(date)}
			>
				{sortedSlots.length === 0 ? (
					<div className="flex flex-1 items-center justify-center">
						<span className="text-sm text-neutral-600">No meals</span>
					</div>
				) : (
					sortedSlots.map((slot) => (
						<MealSlotCard
							key={slot.id}
							slot={slot}
							onClick={() => onSlotClick?.(slot)}
						/>
					))
				)}
			</div>
		</div>
	);
}
```

**Step 2: Create MealSlotCard component**

```typescript
// src/components/calendar/MealSlotCard.tsx
import { cn } from "@/lib/utils";
import { formatTime, getMealTypeIcon } from "@/lib/date";
import type { MealSlot } from "@/types";

interface MealSlotCardProps {
	slot: MealSlot;
	onClick?: () => void;
}

export function MealSlotCard({ slot, onClick }: MealSlotCardProps) {
	const icon = getMealTypeIcon(slot.mealType);
	const time = formatTime(slot.timing.plannedStart);
	const participantCount = slot.participants.filter(
		(p) => p.status === "confirmed" || p.status === "eaten"
	).length;

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick?.();
			}}
			className={cn(
				"group flex flex-col gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-left transition-colors",
				"hover:border-neutral-700 hover:bg-neutral-800"
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between">
				<span className="text-lg">{icon}</span>
				<span className="text-xs text-neutral-500">{time}</span>
			</div>

			{/* Meal name or placeholder */}
			<div className="text-sm font-medium text-neutral-200">
				{slot.plannedMeal ? "Planned meal" : "Unplanned"}
			</div>

			{/* Participants */}
			{participantCount > 0 && (
				<div className="text-xs text-neutral-500">
					{participantCount} {participantCount === 1 ? "person" : "people"}
				</div>
			)}

			{/* Status indicator */}
			{slot.status !== "planned" && (
				<div
					className={cn(
						"mt-1 inline-flex self-start rounded-full px-2 py-0.5 text-xs",
						slot.status === "confirmed" && "bg-green-900/50 text-green-400",
						slot.status === "skipped" && "bg-red-900/50 text-red-400",
						slot.status === "modified" && "bg-yellow-900/50 text-yellow-400"
					)}
				>
					{slot.status}
				</div>
			)}
		</button>
	);
}
```

**Step 3: Create WeekView component**

```typescript
// src/components/calendar/WeekView.tsx
import { useMemo, useState } from "react";
import { formatDate, getWeekDates, getWeekStart } from "@/lib/date";
import { useCalendarStore } from "@/stores/calendar";
import type { MealSlot } from "@/types";
import { DayColumn } from "./DayColumn";

interface WeekViewProps {
	initialDate?: Date;
	onSlotClick?: (slot: MealSlot) => void;
	onEmptyClick?: (date: Date) => void;
}

export function WeekView({ initialDate = new Date(), onSlotClick, onEmptyClick }: WeekViewProps) {
	const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(initialDate));
	const mealSlots = useCalendarStore((s) => s.mealSlots);

	const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

	const slotsByDate = useMemo(() => {
		const map = new Map<string, MealSlot[]>();
		for (const date of weekDates) {
			const dateStr = formatDate(date);
			map.set(
				dateStr,
				mealSlots.filter((s) => s.date === dateStr)
			);
		}
		return map;
	}, [weekDates, mealSlots]);

	const goToPreviousWeek = () => {
		const prev = new Date(currentWeekStart);
		prev.setDate(prev.getDate() - 7);
		setCurrentWeekStart(prev);
	};

	const goToNextWeek = () => {
		const next = new Date(currentWeekStart);
		next.setDate(next.getDate() + 7);
		setCurrentWeekStart(next);
	};

	const goToToday = () => {
		setCurrentWeekStart(getWeekStart(new Date()));
	};

	return (
		<div className="flex h-full flex-col">
			{/* Navigation header */}
			<div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
				<button
					type="button"
					onClick={goToPreviousWeek}
					className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
				>
					← Previous
				</button>

				<button
					type="button"
					onClick={goToToday}
					className="rounded-lg px-4 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
				>
					Today
				</button>

				<button
					type="button"
					onClick={goToNextWeek}
					className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
				>
					Next →
				</button>
			</div>

			{/* Week grid */}
			<div className="grid flex-1 grid-cols-7">
				{weekDates.map((date) => (
					<DayColumn
						key={formatDate(date)}
						date={date}
						slots={slotsByDate.get(formatDate(date)) ?? []}
						onSlotClick={onSlotClick}
						onEmptyClick={onEmptyClick}
					/>
				))}
			</div>
		</div>
	);
}
```

**Step 4: Create barrel export**

```typescript
// src/components/calendar/index.ts
export { WeekView } from "./WeekView";
export { DayColumn } from "./DayColumn";
export { MealSlotCard } from "./MealSlotCard";
```

**Step 5: Remove components gitkeep and commit**

```bash
rm src/components/.gitkeep 2>/dev/null || true
git add src/components/calendar/
git commit -m "feat(components): add calendar week view"
```

---

## Task 9: Update Home Route with Calendar

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Update home route**

```typescript
// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { WeekView } from "@/components/calendar";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<main className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b border-neutral-800 px-6 py-4">
				<h1 className="text-2xl font-bold">Nourri</h1>
			</header>

			{/* Calendar */}
			<div className="flex-1 overflow-hidden">
				<WeekView
					onSlotClick={(slot) => {
						console.log("Clicked slot:", slot);
					}}
					onEmptyClick={(date) => {
						console.log("Clicked empty date:", date);
					}}
				/>
			</div>
		</main>
	);
}
```

**Step 2: Run dev server to verify**

```bash
bun dev
```

Expected: App loads with calendar week view. Navigate weeks with arrows.

**Step 3: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat(routes): integrate calendar into home page"
```

---

## Task 10: Run Full Test Suite & Lint

**Step 1: Run all tests**

```bash
bun test
```

Expected: All tests pass

**Step 2: Run type check**

```bash
bunx tsc --noEmit
```

Expected: No type errors

**Step 3: Run linter**

```bash
bun check
```

Expected: No errors (may apply fixes)

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "chore: apply linting fixes" || echo "Nothing to commit"
```

---

## Summary

After completing all tasks:

- **10 tasks** completed
- **Zod schemas** for all core types (primitives, household, calendar)
- **CRDT stores** for household and calendar data
- **Date utilities** with ts-pattern for type-safe matching
- **Calendar UI** with week view, day columns, and meal slot cards
- **Local-first** with Yjs persistence

**Next phases:**
- Phase 2: Household onboarding flow
- Phase 3: Inventory system
- Phase 4: Meal database & planning
