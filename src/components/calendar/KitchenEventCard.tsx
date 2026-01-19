// src/components/calendar/KitchenEventCard.tsx
// Unified timeline slot with time-first layout

import { useCallback, useRef } from "react";
import type { KitchenEvent } from "@/lib/mockKitchenEvents";
import { getEventStatus, PERSON_INFO } from "@/lib/mockKitchenEvents";
import { cn } from "@/lib/utils";
import type { PersonId } from "@/types";

interface KitchenEventCardProps {
	event: KitchenEvent;
	onPin?: () => void;
	onConfirm?: () => void;
	onDislike?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onClick?: () => void;
	/** Long-press on done items to undo */
	onUndoDone?: () => void;
	/** Minimal mode: hide time display and action buttons (for alternative selection) */
	minimal?: boolean;
	/** Highlight with pulse animation (for "adjusted for balance" feedback) */
	highlighted?: boolean;
	/** Preview time during drag (overrides event.startTime for display) */
	previewTime?: number | null;
	/** Current time for status calculation (supports debug time override) */
	now?: number;
}

// === Time Display ===

function formatAbsoluteTime(timestamp: number): string {
	const date = new Date(timestamp);
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const hour12 = hours % 12 || 12;
	const ampm = hours >= 12 ? "PM" : "AM";
	return `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function getRelativeTime(
	timestamp: number,
	status: string,
	now: number = Date.now(),
): { text: string; urgent: boolean } {
	if (status === "done") {
		return { text: "done", urgent: false };
	}
	if (status === "active") {
		return { text: "NOW", urgent: true };
	}

	const diff = timestamp - now;
	const diffMins = Math.round(diff / 60000);

	if (diffMins < 0) {
		const pastMins = Math.abs(diffMins);
		if (pastMins < 60) return { text: `${pastMins}m late`, urgent: true };
		const hours = Math.floor(pastMins / 60);
		return { text: `${hours}h late`, urgent: true };
	}
	if (diffMins < 60) return { text: `in ${diffMins}m`, urgent: diffMins <= 15 };
	if (diffMins < 120) return { text: "in 1h", urgent: false };
	const hours = Math.floor(diffMins / 60);
	return { text: `in ${hours}h`, urgent: false };
}

// === Event Type Icons ===

// === Content Display ===
// Unified design: [Type Tag] · [Primary Content]
//                 [Secondary details]

const TYPE_CONFIG: Record<
	KitchenEvent["type"],
	{ label: string; color: string; mutedColor: string }
> = {
	cooking: { label: "Cook", color: "text-amber-400", mutedColor: "text-stone-500" },
	eating: { label: "Eat", color: "text-sage-400", mutedColor: "text-stone-500" },
	defrost: { label: "Defrost", color: "text-sky-400", mutedColor: "text-stone-500" },
	grocery: { label: "Grocery", color: "text-emerald-400", mutedColor: "text-stone-500" },
	dishwasher: { label: "Dishes", color: "text-violet-400", mutedColor: "text-stone-500" },
};

function EventContent({
	event,
	muted,
	expanded,
	minimal,
}: {
	event: KitchenEvent;
	muted: boolean;
	expanded?: boolean;
	minimal?: boolean;
}) {
	const config = TYPE_CONFIG[event.type];
	const meal = event.meal;
	const primary = meal?.main ?? event.title;

	const hasExtras = (meal?.extras?.length ?? 0) > 0;
	const extrasCount = meal?.extras?.length ?? 0;

	return (
		<div className="flex flex-col gap-0.5">
			{/* Primary: Type + Main dish */}
			<div className="flex items-baseline gap-2">
				{!minimal && (
					<span
						className={cn(
							"shrink-0 text-xs font-medium uppercase tracking-wide",
							muted ? config.mutedColor : config.color,
						)}
					>
						{config.label}
					</span>
				)}
				<span
					className={cn(
						"text-[15px] font-medium leading-snug",
						muted ? "text-stone-500" : "text-stone-100",
					)}
				>
					{primary}
				</span>
			</div>

			{/* Sides + Drink - as list */}
			{((meal?.sides && meal.sides.length > 0) || meal?.drink) && (
				<ul className={cn("text-sm leading-relaxed", muted ? "text-stone-500" : "text-stone-400")}>
					{meal?.sides?.map((side) => (
						<li key={side} className="flex items-center gap-1.5">
							<span className="h-1 w-1 rounded-full bg-current opacity-40" />
							{side}
						</li>
					))}
					{meal?.drink && (
						<li className="flex items-center gap-1.5">
							<span className="h-1 w-1 rounded-full bg-current opacity-40" />
							{meal.drink}
						</li>
					)}
				</ul>
			)}

			{/* Extras count - collapsed */}
			{hasExtras && !expanded && (
				<div className={cn("text-xs", muted ? "text-stone-600" : "text-stone-500")}>
					+{extrasCount} more
				</div>
			)}

			{/* Extras expanded */}
			{hasExtras && expanded && (
				<ul className={cn("text-xs leading-relaxed", muted ? "text-stone-600" : "text-stone-500")}>
					{meal?.extras?.map((item) => (
						<li key={item} className="flex items-center gap-1.5">
							<span className="h-1 w-1 rounded-full bg-current opacity-40" />
							{item}
						</li>
					))}
				</ul>
			)}

			{/* Non-meal description */}
			{!meal && event.description && (
				<div className={cn("text-sm", muted ? "text-stone-500" : "text-stone-400")}>
					{event.description}
				</div>
			)}
		</div>
	);
}

// === Participants - stacked avatars ===

function ParticipantAvatars({
	participants,
	muted,
}: {
	participants: PersonId[];
	muted?: boolean;
}) {
	if (participants.length === 0) return null;

	return (
		<div className={cn("flex -space-x-2.5", muted && "opacity-40")}>
			{participants.map((id, i) => {
				const info = PERSON_INFO[id];
				if (!info) return null;

				return (
					<div
						key={id}
						className={cn(
							"h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-stone-900",
							info.color,
						)}
						style={{ zIndex: i }}
						title={info.name}
					>
						{info.initial}
					</div>
				);
			})}
		</div>
	);
}

// === Icons ===

function PinIcon({ filled, className }: { filled: boolean; className?: string }) {
	return (
		<svg
			className={cn("h-4 w-4", className)}
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth={1.5}
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.5 3.75V7.5a2.25 2.25 0 002.25 2.25h.75m-9 6v6m0-6H6m4.5 0h3M6 12.75h12m-6-9V3m0 .75a2.25 2.25 0 00-2.25 2.25v6a2.25 2.25 0 002.25 2.25h0a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0012 3.75z"
			/>
		</svg>
	);
}

function ConfirmIcon({ confirmed, className }: { confirmed: boolean; className?: string }) {
	if (confirmed) {
		return (
			<svg
				className={cn("h-4 w-4", className)}
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					fillRule="evenodd"
					d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}
	return (
		<svg
			className={cn("h-4 w-4", className)}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="9" />
		</svg>
	);
}

function RefreshIcon({ className }: { className?: string }) {
	return (
		<svg
			className={cn("h-4 w-4", className)}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
			/>
		</svg>
	);
}

// === Main Component ===

export function KitchenEventCard({
	event,
	onPin,
	onConfirm,
	onDislike,
	onClick,
	onUndoDone,
	minimal = false,
	highlighted = false,
	previewTime,
	now,
}: KitchenEventCardProps) {
	const currentTime = now ?? Date.now();
	const status = getEventStatus(event, currentTime);
	const displayTime = previewTime ?? event.startTime;
	const { text: relativeTime, urgent } = getRelativeTime(displayTime, status, currentTime);
	const absoluteTime = formatAbsoluteTime(displayTime);
	const isDone = status === "done";
	const isActive = status === "active";
	const isOverdue = status === "overdue";

	// Long-press handling for undoing done items
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressTriggered = useRef(false);

	const startLongPress = useCallback(() => {
		if (!isDone || !onUndoDone) return;
		longPressTriggered.current = false;
		longPressTimer.current = setTimeout(() => {
			longPressTriggered.current = true;
			onUndoDone();
		}, 500);
	}, [isDone, onUndoDone]);

	const cancelLongPress = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const handleClick = useCallback(() => {
		// Don't trigger click if long-press was triggered
		if (longPressTriggered.current) {
			longPressTriggered.current = false;
			return;
		}
		onClick?.();
	}, [onClick]);

	// Progress for active events
	const progress =
		isActive && event.endTime
			? Math.min(100, ((currentTime - event.startTime) / (event.endTime - event.startTime)) * 100)
			: null;

	// Visual state classes
	const cardClasses = cn(
		"group relative grid w-full h-full gap-3 rounded-xl border px-3 py-2.5 text-left transition-[opacity,border-color,background-color,box-shadow] duration-200",
		minimal ? "grid-cols-1 min-h-[72px]" : "grid-cols-[3.5rem_1fr] cursor-pointer",
		// Highlighted: gentle glow animation for "adjusted for balance" feedback
		highlighted && "animate-highlight-glow",
		// Done: muted colors with hover brightening (no opacity to avoid jitter)
		!highlighted &&
			isDone &&
			"border-stone-800/50 bg-stone-900/30 hover:border-stone-700 hover:bg-stone-900/50",
		// Overdue: warning - needs attention
		!highlighted &&
			isOverdue &&
			"border-terra-500/50 bg-gradient-to-br from-terra-500/10 to-terra-500/5 shadow-[0_0_16px_rgba(201,118,83,0.1)] hover:border-terra-500/70 hover:shadow-[0_0_20px_rgba(201,118,83,0.15)]",
		// Active: glow
		!highlighted &&
			isActive &&
			"border-sage-600/50 bg-gradient-to-br from-sage-500/10 to-sage-500/5 shadow-[0_0_24px_rgba(95,155,113,0.15)] hover:border-sage-500/70 hover:shadow-[0_0_28px_rgba(95,155,113,0.2)]",
		// Confirmed: accent (future)
		!highlighted &&
			!isDone &&
			!isOverdue &&
			!isActive &&
			event.confirmed &&
			"border-sage-600/50 bg-gradient-to-br from-sage-500/10 to-sage-500/5 hover:border-sage-500/70",
		// Pinned: solid (future)
		!highlighted &&
			!isDone &&
			!isOverdue &&
			!isActive &&
			!event.confirmed &&
			event.pinned &&
			"border-stone-700 bg-stone-900/70 hover:border-stone-600",
		// Unpinned: dashed, muted (future)
		!highlighted &&
			!isDone &&
			!isOverdue &&
			!isActive &&
			!event.confirmed &&
			!event.pinned &&
			"border-dashed border-stone-700 bg-stone-900/40 hover:border-stone-600",
	);

	// Always render as div to avoid nested button issue (action buttons are inside)
	const interactiveProps = minimal
		? {}
		: {
				role: "button" as const,
				tabIndex: 0,
				onClick: handleClick,
				onKeyDown: (e: React.KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick();
					}
				},
			};

	return (
		<div {...interactiveProps} className={cardClasses}>
			{/* Left: Time + Participants stacked (hidden in minimal mode) */}
			{!minimal && (
				<div className="flex flex-col justify-between gap-2">
					<div className="w-14 shrink-0">
						<div
							className={cn(
								"text-sm font-semibold tabular-nums leading-tight",
								isDone
									? "text-stone-500"
									: urgent
										? "text-terra-400"
										: isActive
											? "text-sage-400"
											: "text-stone-200",
							)}
						>
							{relativeTime}
						</div>
						<div className="text-[11px] tabular-nums text-stone-600">{absoluteTime}</div>
					</div>
					<ParticipantAvatars participants={event.participants} muted={isDone} />
				</div>
			)}

			{/* Center: Content */}
			<div className={cn("flex flex-col gap-1 min-w-0", !minimal && "pr-16")}>
				<EventContent event={event} muted={isDone} minimal={minimal} />

				{/* Progress bar for active (hidden in minimal mode) */}
				{!minimal && progress !== null && (
					<div className="h-0.5 w-full overflow-hidden rounded-full bg-stone-800">
						<div
							className="h-full bg-sage-500 transition-all duration-1000"
							style={{ width: `${progress}%` }}
						/>
					</div>
				)}
			</div>

			{/* Right: Actions - absolutely positioned (hidden in minimal mode) */}
			{!minimal && (
				<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
					{/* Dislike/refresh button - available for unpinned future, or any overdue (past can be modified) */}
					{!isDone && (!event.pinned || isOverdue) && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDislike?.(e);
							}}
							className="rounded p-1 text-stone-600 transition-colors hover:bg-stone-800 hover:text-stone-400"
							aria-label="Show alternatives"
						>
							<RefreshIcon />
						</button>
					)}

					{/* Pin button - hidden for past events (done/overdue are implicitly pinned) */}
					{!isDone && !isOverdue && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onPin?.();
							}}
							className={cn(
								"rounded p-1 transition-colors",
								event.pinned
									? "text-sage-400 hover:bg-sage-500/10"
									: "text-stone-600 hover:bg-stone-800 hover:text-stone-400",
							)}
							aria-label={event.pinned ? "Unpin" : "Pin"}
						>
							<PinIcon filled={event.pinned} />
						</button>
					)}

					{/* Confirm button - long-press to undo when done */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							// Don't trigger click if long-press was triggered
							if (longPressTriggered.current) {
								longPressTriggered.current = false;
								return;
							}
							onConfirm?.();
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
							startLongPress();
						}}
						onMouseUp={cancelLongPress}
						onMouseLeave={cancelLongPress}
						onTouchStart={(e) => {
							e.stopPropagation();
							startLongPress();
						}}
						onTouchEnd={cancelLongPress}
						className={cn(
							"rounded p-1 transition-colors",
							isDone
								? "text-stone-600 hover:bg-stone-800 hover:text-stone-400"
								: event.confirmed
									? "text-sage-400"
									: "text-stone-600 hover:bg-stone-800 hover:text-stone-400",
						)}
						aria-label={isDone ? "Long-press to undo" : event.confirmed ? "Confirmed" : "Confirm"}
					>
						<ConfirmIcon confirmed={event.confirmed || isDone} />
					</button>
				</div>
			)}
		</div>
	);
}
