import { create } from "zustand";

interface DebugTimeState {
	// null means use real time, otherwise use this timestamp
	overrideTime: number | null;
	setOverrideTime: (time: number | null) => void;
	// Get current time (override or real)
	getNow: () => number;
}

export const useDebugTimeStore = create<DebugTimeState>((set, get) => ({
	overrideTime: null,
	setOverrideTime: (time) => set({ overrideTime: time }),
	getNow: () => get().overrideTime ?? Date.now(),
}));
