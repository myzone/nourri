import type { PersonId } from "@/types";
import { formatDate } from "./date";

// Event types for the unified timeline (cleanup removed - too noisy)
export type KitchenEventType = "cooking" | "eating" | "defrost" | "grocery" | "dishwasher";

export type EventStatus =
	| "upcoming"
	| "soon" // within 30min
	| "active" // in progress
	| "done"
	| "overdue";

// Structured meal description for glanceability
export interface MealDescription {
	main: string; // Primary dish: "Herb-crusted baked salmon (200g)"
	sides?: string[]; // Side dishes: ["Roasted asparagus", "Quinoa pilaf"]
	extras?: string[]; // Toppings/garnishes: ["Lemon zest", "Fresh dill"]
	drink?: string; // Beverage: "Glass of water with lemon"
}

// Pool of alternative meals for rejection/regeneration feature
const ALTERNATIVE_MEALS: MealDescription[] = [
	// Light options
	{ main: "Greek salad with grilled chicken", sides: ["Whole grain pita"] },
	{ main: "Veggie stir-fry with tofu", sides: ["Jasmine rice"] },
	{ main: "Salmon poke bowl", sides: ["Edamame", "Seaweed salad"] },
	{ main: "Caprese salad", sides: ["Crusty bread"] },
	{ main: "Shrimp lettuce wraps", sides: ["Mango salsa"] },
	// Hearty options
	{ main: "Beef and broccoli", sides: ["Brown rice"] },
	{ main: "Chicken tikka masala", sides: ["Basmati rice", "Naan"] },
	{ main: "Spaghetti bolognese", sides: ["Garden salad"] },
	{ main: "Grilled ribeye steak", sides: ["Baked potato", "Asparagus"] },
	{ main: "Pulled pork tacos", sides: ["Black beans", "Corn salad"] },
	// Quick options
	{ main: "Turkey and avocado sandwich", sides: ["Mixed greens"] },
	{ main: "Veggie quesadilla", sides: ["Guacamole", "Salsa"] },
	{ main: "Tuna salad wrap", sides: ["Apple slices"] },
	{ main: "Egg fried rice", sides: ["Miso soup"] },
	{ main: "Grilled cheese with tomato soup" },
	// Breakfast/brunch options
	{ main: "Spinach and feta omelette", sides: ["Toast", "Fresh fruit"] },
	{ main: "Pancakes with maple syrup", sides: ["Bacon", "Fresh berries"] },
	{ main: "Avocado toast with smoked salmon", extras: ["Capers", "Red onion"] },
	{ main: "Yogurt parfait with granola", extras: ["Honey", "Mixed berries"] },
	{ main: "Breakfast burrito", sides: ["Salsa", "Sour cream"] },
];

// Get random alternatives (excluding a specific meal if provided)
export function getRandomAlternatives(count: number, excludeMain?: string): MealDescription[] {
	const filtered = excludeMain
		? ALTERNATIVE_MEALS.filter((m) => m.main !== excludeMain)
		: ALTERNATIVE_MEALS;
	const shuffled = [...filtered].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// Event nutrition with full micro/vitamin data
interface EventNutrition {
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
	vitaminA?: number; // % daily value
	vitaminC?: number;
	vitaminD?: number;
	iron?: number;
	calcium?: number;
}

export interface KitchenEvent {
	id: string;
	type: KitchenEventType;
	date: string; // ISO date "YYYY-MM-DD"
	startTime: number; // timestamp
	endTime: number | null; // null for point-in-time events
	title: string; // e.g., "Dinner"
	meal?: MealDescription; // structured meal info
	description: string | null; // legacy fallback
	participants: PersonId[]; // who's involved
	status: EventStatus;

	// User interaction states
	pinned: boolean; // locked from regeneration
	confirmed: boolean; // user committed to this

	// Type-specific fields
	cookingOutput?: {
		portions: number;
		storageDays: number;
		storageLocation: "fridge" | "freezer";
	};
	inventorySource?: {
		description: string;
	};
	nutrition?: EventNutrition;
	durationMins?: number;
}

// Helper to get status based on time
export function getEventStatus(event: KitchenEvent, now: number = Date.now()): EventStatus {
	if (event.status === "done") return "done";

	const startTime = event.startTime;
	const endTime = event.endTime ?? startTime;

	// Currently happening
	if (now >= startTime && now <= endTime) return "active";

	// Should have started but hasn't
	if (now > startTime) return "overdue";

	// Within 30 minutes
	const minsUntil = (startTime - now) / 60000;
	if (minsUntil > 0 && minsUntil <= 30) return "soon";

	return "upcoming";
}

export const PERSON_ALEX = "person_alex001" as PersonId;
export const PERSON_SAM = "person_sam002" as PersonId;

// Person display info
export const PERSON_INFO: Record<PersonId, { name: string; initial: string; color: string }> = {
	[PERSON_ALEX]: { name: "Alex", initial: "A", color: "bg-sky-500" },
	[PERSON_SAM]: { name: "Sam", initial: "S", color: "bg-amber-500" },
};

export const ALL_PERSONS = [PERSON_ALEX, PERSON_SAM] as const;

// Helper to create event at a specific timestamp
export function createEventAtTime(
	startTime: number,
	type: KitchenEventType,
	title: string,
	options: Partial<Omit<KitchenEvent, "id" | "type" | "date" | "startTime" | "title">> = {},
): KitchenEvent {
	const now = Date.now();
	const startDate = new Date(startTime);
	const endTime = options.durationMins ? startTime + options.durationMins * 60000 : null;

	// Auto-determine status based on time
	let status: EventStatus = "upcoming";
	if (options.status === "done") {
		status = "done";
	} else if (endTime && now >= startTime && now <= endTime) {
		status = "active";
	} else if (now > startTime) {
		status = "overdue";
	} else {
		const minsUntil = (startTime - now) / 60000;
		if (minsUntil > 0 && minsUntil <= 30) status = "soon";
	}

	return {
		id: `event_${Math.random().toString(36).slice(2, 10)}`,
		type,
		date: formatDate(startDate),
		startTime,
		endTime,
		title,
		meal: options.meal,
		description: options.description ?? null,
		participants: options.participants ?? [PERSON_ALEX],
		status,
		pinned: options.pinned ?? false,
		confirmed: options.confirmed ?? false,
		cookingOutput: options.cookingOutput,
		inventorySource: options.inventorySource,
		nutrition: options.nutrition,
		durationMins: options.durationMins,
	};
}

// Helper to create event at offset from now (in minutes)
function createEventAtOffset(
	offsetMins: number,
	type: KitchenEventType,
	title: string,
	options: Partial<Omit<KitchenEvent, "id" | "type" | "date" | "startTime" | "title">> = {},
): KitchenEvent {
	const now = Date.now();
	const startTime = now + offsetMins * 60000;
	const startDate = new Date(startTime);
	const endTime = options.durationMins ? startTime + options.durationMins * 60000 : null;

	// Auto-determine status based on time
	let status: EventStatus = "upcoming";
	if (options.status === "done") {
		status = "done";
	} else if (endTime && now >= startTime && now <= endTime) {
		status = "active";
	} else if (now > startTime) {
		status = "overdue";
	} else {
		const minsUntil = offsetMins;
		if (minsUntil > 0 && minsUntil <= 30) status = "soon";
	}

	return {
		id: `event_${Math.random().toString(36).slice(2, 10)}`,
		type,
		date: formatDate(startDate),
		startTime,
		endTime,
		title,
		meal: options.meal,
		description: options.description ?? null,
		participants: options.participants ?? [PERSON_ALEX],
		status,
		pinned: options.pinned ?? false,
		confirmed: options.confirmed ?? false,
		cookingOutput: options.cookingOutput,
		inventorySource: options.inventorySource,
		nutrition: options.nutrition,
		durationMins: options.durationMins,
	};
}

export function generateMockKitchenEvents(): KitchenEvent[] {
	const events: KitchenEvent[] = [];

	// ===== PAST EVENTS (done) =====

	// Breakfast from this morning (-5 hours)
	events.push(
		createEventAtOffset(-300, "eating", "Breakfast", {
			meal: {
				main: "Sourdough avocado toast with poached eggs",
				sides: ["Greek yogurt with honey and walnuts"],
				extras: ["Cherry tomatoes", "Microgreens", "Everything seasoning"],
			},
			participants: [PERSON_ALEX, PERSON_SAM],
			durationMins: 30,
			status: "done",
			pinned: true,
			confirmed: true,
			nutrition: {
				calories: 520,
				protein: 22,
				carbs: 38,
				fat: 32,
				fiber: 8,
				sugar: 12,
				sodium: 580,
				vitaminA: 15,
				vitaminC: 25,
				iron: 20,
				calcium: 12,
			},
		}),
	);

	// Snack from earlier (-2 hours)
	events.push(
		createEventAtOffset(-120, "eating", "Snack", {
			meal: {
				main: "Apple slices with almond butter",
			},
			participants: [PERSON_ALEX],
			durationMins: 15,
			status: "done",
			pinned: false,
			confirmed: true,
			nutrition: {
				calories: 180,
				protein: 4,
				carbs: 22,
				fat: 10,
				fiber: 4,
				sugar: 16,
				sodium: 45,
			},
		}),
	);

	// ===== OVERDUE EVENT =====

	// Defrost that should have happened (-45 mins)
	events.push(
		createEventAtOffset(-45, "defrost", "Move chicken to fridge", {
			description: "Defrost for dinner tonight",
			participants: [PERSON_ALEX],
			pinned: true,
			confirmed: false,
		}),
	);

	// ===== ACTIVE EVENT (happening now) =====

	// Currently cooking (-10 mins, 30 min duration = ends in 20 mins)
	events.push(
		createEventAtOffset(-10, "cooking", "Prep dinner", {
			meal: {
				main: "Herb-crusted baked salmon",
				sides: ["Roasted asparagus", "Quinoa pilaf"],
			},
			participants: [PERSON_ALEX],
			durationMins: 30,
			pinned: true,
			confirmed: true,
		}),
	);

	// ===== SOON (within 30 mins) =====

	// Dinner in 25 mins
	events.push(
		createEventAtOffset(25, "eating", "Dinner", {
			meal: {
				main: "Herb-crusted baked salmon",
				sides: ["Roasted asparagus", "Quinoa pilaf", "Mixed green salad"],
				extras: ["Lemon wedge", "Fresh dill"],
			},
			participants: [PERSON_ALEX, PERSON_SAM],
			durationMins: 45,
			pinned: true,
			confirmed: true,
			nutrition: {
				calories: 580,
				protein: 42,
				carbs: 35,
				fat: 28,
				fiber: 6,
				sugar: 4,
				sodium: 420,
				vitaminA: 35,
				vitaminC: 40,
				vitaminD: 80,
				iron: 18,
				calcium: 8,
			},
		}),
	);

	// ===== UPCOMING (today) =====

	// Dishwasher in 1.5 hours
	events.push(
		createEventAtOffset(90, "dishwasher", "Run dishwasher", {
			participants: [PERSON_SAM],
			pinned: false,
			confirmed: false,
		}),
	);

	// ===== TOMORROW =====

	// Tomorrow breakfast (+18 hours)
	events.push(
		createEventAtOffset(18 * 60, "eating", "Breakfast", {
			meal: {
				main: "Overnight oats with almond milk",
				extras: ["Chia seeds", "Sliced banana", "Blueberries", "Maple syrup"],
				drink: "Black coffee",
			},
			participants: [PERSON_ALEX],
			durationMins: 20,
			pinned: true,
			confirmed: false,
			nutrition: {
				calories: 380,
				protein: 12,
				carbs: 58,
				fat: 10,
				fiber: 8,
				sugar: 22,
				sodium: 120,
				vitaminA: 5,
				vitaminC: 15,
				iron: 15,
				calcium: 20,
			},
		}),
	);

	// Tomorrow lunch (+22 hours)
	events.push(
		createEventAtOffset(22 * 60, "eating", "Lunch", {
			meal: {
				main: "Mediterranean chickpea bowl with feta",
				sides: ["Whole grain pita"],
			},
			participants: [PERSON_ALEX],
			durationMins: 30,
			pinned: false,
			confirmed: false,
			nutrition: {
				calories: 450,
				protein: 18,
				carbs: 52,
				fat: 18,
				fiber: 12,
				sugar: 8,
				sodium: 680,
				vitaminA: 25,
				vitaminC: 35,
				iron: 22,
				calcium: 15,
			},
		}),
	);

	// Tomorrow dinner prep (+27 hours)
	events.push(
		createEventAtOffset(27 * 60, "cooking", "Cook chicken dinner", {
			meal: {
				main: "Grilled lemon herb chicken breast",
				sides: ["Sautéed spinach", "Roasted sweet potato wedges"],
			},
			participants: [PERSON_ALEX],
			durationMins: 25,
			pinned: true,
			confirmed: true,
		}),
	);

	// Tomorrow dinner (+28 hours)
	events.push(
		createEventAtOffset(28 * 60, "eating", "Dinner", {
			meal: {
				main: "Grilled lemon herb chicken breast",
				sides: ["Sautéed spinach with garlic", "Roasted sweet potato wedges"],
				drink: "Water with lemon",
			},
			participants: [PERSON_ALEX, PERSON_SAM],
			durationMins: 40,
			pinned: true,
			confirmed: true,
			nutrition: {
				calories: 520,
				protein: 45,
				carbs: 42,
				fat: 16,
				fiber: 7,
				sugar: 8,
				sodium: 380,
				vitaminA: 180,
				vitaminC: 45,
				iron: 25,
				calcium: 10,
			},
		}),
	);

	// ===== DAY AFTER TOMORROW =====

	// Breakfast (+42 hours)
	events.push(
		createEventAtOffset(42 * 60, "eating", "Breakfast", {
			meal: {
				main: "Açaí smoothie bowl",
				extras: ["Granola", "Coconut flakes", "Almond butter", "Fresh strawberries"],
			},
			participants: [PERSON_ALEX],
			durationMins: 20,
			pinned: false,
			confirmed: false,
			nutrition: {
				calories: 420,
				protein: 8,
				carbs: 72,
				fat: 12,
				fiber: 10,
				sugar: 38,
				sodium: 45,
				vitaminA: 8,
				vitaminC: 65,
				iron: 12,
				calcium: 8,
			},
		}),
	);

	// Grocery delivery (+44 hours)
	events.push(
		createEventAtOffset(44 * 60, "grocery", "Grocery delivery", {
			description: "Weekly delivery: produce, proteins, pantry",
			participants: [PERSON_ALEX],
			durationMins: 60,
			pinned: true,
			confirmed: false,
		}),
	);

	// Lunch (+46 hours)
	events.push(
		createEventAtOffset(46 * 60, "eating", "Lunch", {
			meal: {
				main: "Turkey wrap with avocado & hummus",
				sides: ["Apple"],
			},
			participants: [PERSON_ALEX],
			durationMins: 25,
			pinned: false,
			confirmed: false,
			nutrition: {
				calories: 380,
				protein: 28,
				carbs: 42,
				fat: 12,
				fiber: 9,
				sugar: 14,
				sodium: 720,
				vitaminA: 45,
				vitaminC: 20,
				iron: 15,
				calcium: 6,
			},
		}),
	);

	// Dinner prep (+51 hours)
	events.push(
		createEventAtOffset(51 * 60, "cooking", "Cook stir-fry", {
			meal: {
				main: "Ginger garlic shrimp stir-fry",
				sides: ["Brown rice"],
			},
			participants: [PERSON_SAM],
			durationMins: 15,
			pinned: true,
			confirmed: false,
		}),
	);

	// Dinner (+52 hours)
	events.push(
		createEventAtOffset(52 * 60, "eating", "Dinner", {
			meal: {
				main: "Ginger garlic shrimp stir-fry",
				sides: ["Brown rice"],
			},
			participants: [PERSON_ALEX, PERSON_SAM],
			durationMins: 40,
			pinned: true,
			confirmed: false,
			nutrition: {
				calories: 480,
				protein: 32,
				carbs: 48,
				fat: 16,
				fiber: 6,
				sugar: 6,
				sodium: 890,
				vitaminA: 35,
				vitaminC: 95,
				iron: 28,
				calcium: 12,
			},
		}),
	);

	// Dishwasher (+53 hours)
	events.push(
		createEventAtOffset(53 * 60, "dishwasher", "Run dishwasher", {
			participants: [PERSON_ALEX],
			pinned: false,
			confirmed: false,
		}),
	);

	return events;
}
