import { useState } from "react";
import { getDayName, getMonthDay, getRelativeDayLabel, isToday, isTomorrow } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ActualMealType, MealSlot } from "@/types";
import { CompactMealCard } from "./CompactMealCard";
import { TodayMealCard } from "./TodayMealCard";

interface DaySectionProps {
	date: Date;
	slots: MealSlot[];
	isCollapsible?: boolean;
	defaultCollapsed?: boolean;
	onSlotClick?: (slot: MealSlot) => void;
	onLog?: (slotId: string, type: ActualMealType) => void;
	onLock?: (slotId: string) => void;
	onAddMeal?: (date: Date) => void;
}

export function DaySection({
	date,
	slots,
	isCollapsible = false,
	defaultCollapsed = false,
	onSlotClick,
	onLog,
	onLock,
	onAddMeal,
}: DaySectionProps) {
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
	const today = isToday(date);
	const tomorrow = isTomorrow(date);
	const relativeLabel = getRelativeDayLabel(date);

	// Sort slots by meal type order: breakfast, lunch, dinner, snack
	const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
	const sortedSlots = [...slots].sort((a, b) => mealOrder[a.mealType] - mealOrder[b.mealType]);

	return (
		<section className="mb-6">
			{/* Day header */}
			<div className="mb-3 flex items-center justify-between">
				<button
					type="button"
					onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
					className={cn(
						"flex items-center gap-2",
						isCollapsible && "cursor-pointer hover:opacity-80",
					)}
					disabled={!isCollapsible}
				>
					{isCollapsible && (
						<svg
							aria-hidden="true"
							className={cn(
								"h-4 w-4 text-stone-600 transition-transform",
								isCollapsed ? "" : "rotate-90",
							)}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					)}
					<h2
						className={cn(
							"font-semibold",
							today
								? "text-lg text-sage-400"
								: tomorrow
									? "text-base text-stone-200"
									: "text-sm text-stone-400",
						)}
					>
						{relativeLabel}
					</h2>
					<span className="text-sm text-stone-600">
						{today || tomorrow
							? `${getDayName(date, true)}, ${getMonthDay(date)}`
							: getMonthDay(date)}
					</span>
				</button>

				{/* Add meal button for today/tomorrow */}
				{(today || tomorrow) && !isCollapsed && (
					<button
						type="button"
						onClick={() => onAddMeal?.(date)}
						className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-800 hover:text-stone-300"
					>
						<svg
							aria-hidden="true"
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add meal
					</button>
				)}
			</div>

			{/* Collapsed summary */}
			{isCollapsed && (
				<button
					type="button"
					onClick={() => setIsCollapsed(false)}
					className="w-full rounded-xl border border-stone-800/50 bg-stone-900/30 px-4 py-3 text-left hover:border-stone-700"
				>
					<span className="text-sm text-stone-500">
						{sortedSlots.length} {sortedSlots.length === 1 ? "meal" : "meals"}
						{sortedSlots.some((s) => s.status === "confirmed") && (
							<span className="ml-2 text-sage-500">• some locked</span>
						)}
					</span>
				</button>
			)}

			{/* Expanded content */}
			{!isCollapsed && (
				<div
					className={cn(
						today ? "flex flex-col gap-3" : "grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
					)}
				>
					{sortedSlots.length === 0 ? (
						<button
							type="button"
							onClick={() => onAddMeal?.(date)}
							className={cn(
								"flex items-center justify-center rounded-xl border-2 border-dashed border-stone-800 p-4",
								"text-stone-600 hover:border-stone-700 hover:text-stone-500",
								today ? "py-8" : "py-4 col-span-full",
							)}
						>
							<span className="text-sm">
								{today ? "No meals planned for today" : "No meals"} — tap to add
							</span>
						</button>
					) : today ? (
						// Today: Large cards with actions
						sortedSlots.map((slot) => (
							<TodayMealCard
								key={slot.id}
								slot={slot}
								onLog={onLog}
								onLock={onLock}
								onClick={() => onSlotClick?.(slot)}
							/>
						))
					) : (
						// Future: Compact cards
						sortedSlots.map((slot) => (
							<CompactMealCard key={slot.id} slot={slot} onClick={() => onSlotClick?.(slot)} />
						))
					)}
				</div>
			)}
		</section>
	);
}
