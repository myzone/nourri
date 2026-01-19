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
