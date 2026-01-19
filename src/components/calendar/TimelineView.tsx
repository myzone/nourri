import { useMemo, useState } from "react";
import { formatDate, getDayName, getMonthDay } from "@/lib/date";
import { useCalendarStore } from "@/stores/calendar";
import type { ActualMealType, MealSlot } from "@/types";
import { CompactMealCard } from "./CompactMealCard";
import { DaySection } from "./DaySection";

interface TimelineViewProps {
	/** Number of days to include in "Coming up" section */
	upcomingDays?: number;
	onSlotClick?: (slot: MealSlot) => void;
	onLog?: (slotId: string, type: ActualMealType) => void;
	onLock?: (slotId: string) => void;
	onAddMeal?: (date: Date) => void;
}

export function TimelineView({
	upcomingDays = 5,
	onSlotClick,
	onLog,
	onLock,
	onAddMeal,
}: TimelineViewProps) {
	const mealSlots = useCalendarStore((s) => s.mealSlots);
	const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

	// Generate dates
	const { today, tomorrow, upcomingDates } = useMemo(() => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const todayDate = new Date(now);
		const tomorrowDate = new Date(now);
		tomorrowDate.setDate(now.getDate() + 1);

		const upcoming: Date[] = [];
		for (let i = 2; i < 2 + upcomingDays; i++) {
			const d = new Date(now);
			d.setDate(now.getDate() + i);
			upcoming.push(d);
		}

		return { today: todayDate, tomorrow: tomorrowDate, upcomingDates: upcoming };
	}, [upcomingDays]);

	// Get slots for each section
	const todaySlots = useMemo(
		() => mealSlots.filter((s) => s.date === formatDate(today)),
		[mealSlots, today],
	);

	const tomorrowSlots = useMemo(
		() => mealSlots.filter((s) => s.date === formatDate(tomorrow)),
		[mealSlots, tomorrow],
	);

	const upcomingSlots = useMemo(() => {
		const dateStrs = upcomingDates.map((d) => formatDate(d));
		return mealSlots.filter((s) => dateStrs.includes(s.date));
	}, [mealSlots, upcomingDates]);

	// Group upcoming slots by date for expanded view
	const upcomingByDate = useMemo(() => {
		const map = new Map<string, { date: Date; slots: MealSlot[] }>();
		for (const date of upcomingDates) {
			const dateStr = formatDate(date);
			map.set(dateStr, {
				date,
				slots: mealSlots.filter((s) => s.date === dateStr),
			});
		}
		return map;
	}, [upcomingDates, mealSlots]);

	// Count meals in upcoming
	const upcomingMealCount = upcomingSlots.length;
	const upcomingLockedCount = upcomingSlots.filter((s) => s.status === "confirmed").length;

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-stone-800 px-4 py-3 sm:px-6">
				<h1 className="text-xl font-semibold text-stone-100">Nourri</h1>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-800 hover:text-stone-200"
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
							strokeWidth={1.5}
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					Calendar
				</button>
			</div>

			{/* Timeline content */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
					{/* TODAY - Hero section */}
					<DaySection
						date={today}
						slots={todaySlots}
						onSlotClick={onSlotClick}
						onLog={onLog}
						onLock={onLock}
						onAddMeal={onAddMeal}
					/>

					{/* TOMORROW - Detailed but slightly smaller */}
					<DaySection
						date={tomorrow}
						slots={tomorrowSlots}
						onSlotClick={onSlotClick}
						onLog={onLog}
						onLock={onLock}
						onAddMeal={onAddMeal}
					/>

					{/* COMING UP - Single collapsed block */}
					<section className="mb-6">
						<button
							type="button"
							onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
							className="mb-3 flex w-full items-center justify-between text-left"
						>
							<div className="flex items-center gap-2">
								<svg
									aria-hidden="true"
									className={`h-4 w-4 text-stone-600 transition-transform ${isUpcomingExpanded ? "rotate-90" : ""}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
								<h2 className="text-sm font-semibold text-stone-400">Coming up</h2>
								<span className="text-sm text-stone-600">
									{getMonthDay(upcomingDates[0]!)} –{" "}
									{getMonthDay(upcomingDates[upcomingDates.length - 1]!)}
								</span>
							</div>
							<span className="text-xs text-stone-600">
								{upcomingMealCount} {upcomingMealCount === 1 ? "meal" : "meals"}
								{upcomingLockedCount > 0 && (
									<span className="ml-1 text-sage-500">• {upcomingLockedCount} locked</span>
								)}
							</span>
						</button>

						{isUpcomingExpanded ? (
							// Expanded: Show each day
							<div className="space-y-4 rounded-xl border border-stone-800 bg-stone-900/30 p-4">
								{Array.from(upcomingByDate.entries()).map(([dateStr, { date, slots }]) => (
									<div key={dateStr}>
										<div className="mb-2 text-xs font-medium text-stone-500">
											{getDayName(date, true)}, {getMonthDay(date)}
										</div>
										{slots.length === 0 ? (
											<p className="text-sm text-stone-600 italic">No meals planned</p>
										) : (
											<div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
												{slots.map((slot) => (
													<CompactMealCard
														key={slot.id}
														slot={slot}
														onClick={() => onSlotClick?.(slot)}
													/>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							// Collapsed: Summary bar
							<div className="rounded-xl border border-stone-800/50 bg-stone-900/30 px-4 py-3">
								{upcomingMealCount === 0 ? (
									<p className="text-sm text-stone-600 italic">Nothing planned yet</p>
								) : (
									<div className="flex flex-wrap gap-1.5">
										{upcomingSlots.slice(0, 6).map((slot) => (
											<span
												key={slot.id}
												className="rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-400"
											>
												{getDayName(new Date(slot.date + "T12:00:00"), true)} •{" "}
												{slot.mealType.charAt(0).toUpperCase() + slot.mealType.slice(1)}
											</span>
										))}
										{upcomingSlots.length > 6 && (
											<span className="rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-500">
												+{upcomingSlots.length - 6} more
											</span>
										)}
									</div>
								)}
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}
