// src/components/calendar/MealSlotCard.tsx

import { formatTime, getMealTypeIcon } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { MealSlot } from "@/types";

interface MealSlotCardProps {
	slot: MealSlot;
	onClick?: () => void;
}

export function MealSlotCard({ slot, onClick }: MealSlotCardProps) {
	const icon = getMealTypeIcon(slot.mealType);
	const time = formatTime(slot.timing.plannedStart);
	const participantCount = slot.participants.filter(
		(p) => p.status === "confirmed" || p.status === "eaten",
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
				"hover:border-neutral-700 hover:bg-neutral-800",
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
						slot.status === "modified" && "bg-yellow-900/50 text-yellow-400",
					)}
				>
					{slot.status}
				</div>
			)}
		</button>
	);
}
