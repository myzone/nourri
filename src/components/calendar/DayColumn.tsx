// src/components/calendar/DayColumn.tsx

import { getDayName, getMonthDay, isToday } from "@/lib/date";
import { cn } from "@/lib/utils";
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
				today && "bg-neutral-900/50",
			)}
		>
			{/* Day header */}
			<div
				className={cn(
					"sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950 px-2 py-3 text-center",
					today && "bg-neutral-900",
				)}
			>
				<div
					className={cn(
						"text-xs uppercase tracking-wide",
						today ? "text-blue-400" : "text-neutral-500",
					)}
				>
					{getDayName(date, true)}
				</div>
				<div className={cn("text-lg font-semibold", today ? "text-blue-400" : "text-neutral-200")}>
					{getMonthDay(date)}
				</div>
			</div>

			{/* Slots */}
			<button
				type="button"
				className="flex flex-1 flex-col gap-2 p-2 text-left"
				onClick={() => onEmptyClick?.(date)}
			>
				{sortedSlots.length === 0 ? (
					<div className="flex flex-1 items-center justify-center">
						<span className="text-sm text-neutral-600">No meals</span>
					</div>
				) : (
					sortedSlots.map((slot) => (
						<MealSlotCard key={slot.id} slot={slot} onClick={() => onSlotClick?.(slot)} />
					))
				)}
			</button>
		</div>
	);
}
