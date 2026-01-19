import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export const doc = new Y.Doc();

const persistence = new IndexeddbPersistence("nourri", doc);

persistence.on("synced", () => {
	// CRDT synced with IndexedDB
});

function getMap<T>(name: string): Y.Map<T> {
	return doc.getMap<T>(name);
}

function getArray<T>(name: string): Y.Array<T> {
	return doc.getArray<T>(name);
}

// === Store bindings ===

export const householdMap = getMap<unknown>("household");
export const membersArray = getArray<unknown>("members");
export const mealSlotsArray = getArray<unknown>("mealSlots");
export const cookingSlotsArray = getArray<unknown>("cookingSlots");
