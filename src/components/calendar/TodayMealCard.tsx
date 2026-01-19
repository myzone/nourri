import { useState } from "react";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ActualMealType, MealSlot } from "@/types";

interface TodayMealCardProps {
	slot: MealSlot;
	onLog?: (slotId: string, type: ActualMealType) => void;
	onLock?: (slotId: string) => void;
	onClick?: () => void;
}

const LOG_OPTIONS: { type: ActualMealType; label: string; icon: string }[] = [
	{ type: "as_planned", label: "As planned", icon: "✓" },
	{ type: "modified", label: "Modified", icon: "~" },
	{ type: "substitute", label: "Something else", icon: "↻" },
	{ type: "ate_out", label: "Ate out", icon: "🍴" },
	{ type: "skipped", label: "Skipped", icon: "✕" },
];

function getRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = timestamp - now;
	const diffMins = Math.round(diff / 60000);

	if (diffMins < 0) {
		const pastMins = Math.abs(diffMins);
		if (pastMins < 60) return `${pastMins} min ago`;
		return formatTime(timestamp);
	}
	if (diffMins < 60) return `in ${diffMins} min`;
	if (diffMins < 120) return "in 1 hour";
	if (diffMins < 180) return "in 2 hours";
	return formatTime(timestamp);
}

function getCookingStatus(slot: MealSlot): {
	status: "not_started" | "in_progress" | "ready" | "logged";
	label: string;
	urgent: boolean;
} {
	const isLogged = slot.actualMeal !== null;
	if (isLogged) return { status: "logged", label: "Done", urgent: false };

	const cookingStarted = slot.timing.actualStart !== null;
	const mealTime = slot.timing.plannedStart;
	const now = Date.now();
	const minsUntilMeal = Math.round((mealTime - now) / 60000);

	// Parse cooking time from notes if available (format: "Meal name · XX min")
	let cookMins = 30; // default
	if (slot.plannedMeal?.notes) {
		const match = slot.plannedMeal.notes.match(/· (\d+) min/);
		if (match) cookMins = parseInt(match[1]!, 10);
	}

	if (cookingStarted) {
		// Check if cooking is done (actualStart + cookTime < now)
		const cookingDoneAt = slot.timing.actualStart! + cookMins * 60000;
		if (now >= cookingDoneAt) {
			return { status: "ready", label: "Ready", urgent: false };
		}
		return { status: "in_progress", label: "Cooking", urgent: false };
	}

	// Not started - check if urgent
	if (minsUntilMeal <= cookMins) {
		return { status: "not_started", label: "Start now or pivot", urgent: true };
	}
	if (minsUntilMeal <= cookMins + 30) {
		return { status: "not_started", label: "Start soon", urgent: false };
	}
	return { status: "not_started", label: "", urgent: false };
}

export function TodayMealCard({ slot, onLog, onLock, onClick }: TodayMealCardProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const isLogged = slot.actualMeal !== null;
	const isLocked = slot.status === "confirmed";
	const cooking = getCookingStatus(slot);
	const relativeTime = getRelativeTime(slot.timing.plannedStart);

	const mealName = slot.plannedMeal?.notes?.split(" · ")[0] || "Unplanned meal";
	const participantCount = slot.participants.filter(
		(p) => p.status === "confirmed" || p.status === "eaten",
	).length;

	return (
		<div
			className={cn(
				"group rounded-2xl border transition-all duration-200",
				isLogged
					? "border-sage-600/30 bg-sage-600/5"
					: cooking.urgent
						? "border-terra-500/50 bg-terra-500/5"
						: "border-stone-800 bg-stone-900",
				!isLogged && !cooking.urgent && "hover:border-stone-700",
			)}
		>
			{/* Main card content */}
			<button
				type="button"
				onClick={() => {
					if (isLogged) {
						onClick?.();
					} else {
						setIsExpanded(!isExpanded);
					}
				}}
				className="w-full p-4 text-left"
			>
				{/* Header row */}
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1">
						{/* Meal name - the hero */}
						<h3
							className={cn(
								"font-medium",
								isLogged ? "text-stone-400" : "text-stone-100",
								cooking.urgent && "text-terra-300",
							)}
						>
							{mealName}
						</h3>

						{/* Time */}
						<p className="mt-0.5 text-sm text-stone-500">{relativeTime}</p>
					</div>

					{/* Status indicators */}
					<div className="flex flex-col items-end gap-1">
						{cooking.urgent && (
							<span className="rounded-full bg-terra-500/20 px-2 py-0.5 text-xs font-medium text-terra-400">
								{cooking.label}
							</span>
						)}
						{cooking.status === "in_progress" && (
							<span className="rounded-full bg-sage-600/20 px-2 py-0.5 text-xs text-sage-400">
								{cooking.label}
							</span>
						)}
						{cooking.status === "ready" && (
							<span className="rounded-full bg-sage-600/20 px-2 py-0.5 text-xs text-sage-400">
								{cooking.label}
							</span>
						)}
						{isLogged && (
							<span className="rounded-full bg-sage-600/20 px-2 py-0.5 text-xs text-sage-400">
								Done
							</span>
						)}
						{isLocked && !isLogged && (
							<svg
								aria-hidden="true"
								className="h-4 w-4 text-sage-500"
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
				</div>

				{/* Participants */}
				{participantCount > 0 && (
					<div className="mt-3 flex items-center gap-2">
						<div className="flex -space-x-1">
							{slot.participants.slice(0, 4).map((p, i) => (
								<div
									key={p.personId}
									className={cn(
										"flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs",
										isLogged
											? "border-stone-800 bg-stone-700 text-stone-400"
											: "border-stone-900 bg-stone-700 text-stone-300",
									)}
									style={{ zIndex: 4 - i }}
								>
									{p.personId.charAt(7).toUpperCase()}
								</div>
							))}
						</div>
						<span className="text-sm text-stone-500">
							{participantCount} {participantCount === 1 ? "person" : "people"}
						</span>
					</div>
				)}
			</button>

			{/* Expanded: Actions */}
			{isExpanded && !isLogged && (
				<div className="border-t border-stone-800 p-4">
					{cooking.urgent ? (
						// Urgent mode - pivot options
						<>
							<p className="mb-3 text-sm text-terra-400">
								Not enough time to cook this. What would you like to do?
							</p>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										// TODO: Mark cooking as started
									}}
									className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700"
								>
									Start anyway
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										// TODO: Show quick alternatives
									}}
									className="rounded-lg bg-terra-500/20 px-3 py-2 text-sm text-terra-400 hover:bg-terra-500/30"
								>
									Find something quick
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onLog?.(slot.id, "ate_out");
										setIsExpanded(false);
									}}
									className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-400 hover:bg-stone-700"
								>
									Order takeout
								</button>
							</div>
						</>
					) : (
						// Normal mode - cooking actions or log
						<>
							{cooking.status === "not_started" && (
								<div className="mb-4">
									<button
										type="button"
										className="w-full rounded-lg bg-sage-600/20 px-4 py-3 text-sm font-medium text-sage-400 hover:bg-sage-600/30"
									>
										Start cooking
									</button>
								</div>
							)}

							<p className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500">
								Or log what happened
							</p>
							<div className="flex flex-wrap gap-2">
								{LOG_OPTIONS.map((option) => (
									<button
										key={option.type}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onLog?.(slot.id, option.type);
											setIsExpanded(false);
										}}
										className={cn(
											"flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
											option.type === "skipped"
												? "bg-stone-800 text-stone-400 hover:bg-stone-700"
												: "bg-stone-800 text-stone-300 hover:bg-stone-700",
										)}
									>
										<span className="text-xs">{option.icon}</span>
										{option.label}
									</button>
								))}
							</div>

							{/* Lock option */}
							{!isLocked && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onLock?.(slot.id);
									}}
									className="mt-3 flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
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
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										/>
									</svg>
									Lock this plan
								</button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
