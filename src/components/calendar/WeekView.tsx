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
				mealSlots.filter((s) => s.date === dateStr),
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
