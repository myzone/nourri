import { create } from "zustand";
import type { PersonId } from "@/types";

interface PersonFilterState {
	filter: PersonId | "all";
	setFilter: (filter: PersonId | "all") => void;
}

export const usePersonFilterStore = create<PersonFilterState>((set) => ({
	filter: "all",
	setFilter: (filter) => set({ filter }),
}));
