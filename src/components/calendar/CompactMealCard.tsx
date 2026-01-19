import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { MealSlot } from "@/types";

interface CompactMealCardProps {
	slot: MealSlot;
	onClick?: () => void;
}

export function CompactMealCard({ slot, onClick }: CompactMealCardProps) {
	const time = formatTime(slot.timing.plannedStart);
	const isLocked = slot.status === "confirmed";

	// Parse meal name from notes (format: "Meal name · XX min")
	const mealName = slot.plannedMeal?.notes?.split(" · ")[0] || "Unplanned";

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-col rounded-xl border p-3 text-left transition-all duration-150",
				"border-stone-800 bg-stone-900/50",
				"hover:border-stone-700 hover:bg-stone-900",
				"active:scale-[0.98]",
			)}
		>
			{/* Meal name */}
			<div className="flex items-start justify-between gap-2">
				<span className="text-sm font-medium text-stone-300 line-clamp-2">{mealName}</span>
				{isLocked && (
					<svg
						aria-hidden="true"
						className="h-3.5 w-3.5 flex-shrink-0 text-sage-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				)}
			</div>

			{/* Time */}
			<div className="mt-1 text-xs text-stone-500">{time}</div>
		</button>
	);
}
