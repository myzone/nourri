// src/components/calendar/MealAlternativeCarousel.tsx
// Overlay carousel for selecting alternative meals

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "@/lib/date";
import type { KitchenEvent, MealDescription } from "@/lib/mockKitchenEvents";
import { getRandomAlternatives } from "@/lib/mockKitchenEvents";
import { cn } from "@/lib/utils";
import { KitchenEventCard } from "./KitchenEventCard";

interface MealAlternativeCarouselProps {
	currentMeal?: MealDescription;
	onSelectAlternative: (meal: MealDescription) => void;
	onSkip: () => void;
	onCancel: () => void;
	/** Position to align with original card */
	cardRect: {
		top: number;
		left: number;
		width: number;
		height: number;
	};
}

// Create a KitchenEvent from a meal for display in KitchenEventCard
function mealToEvent(meal: MealDescription, index: number): KitchenEvent {
	const now = Date.now();
	return {
		id: `alt-${index}-${now}`,
		type: "eating",
		date: formatDate(new Date()),
		startTime: now + 3600000,
		endTime: null,
		title: "Alternative",
		meal,
		description: null,
		participants: [],
		status: "upcoming",
		pinned: false,
		confirmed: false,
	};
}

export function MealAlternativeCarousel({
	currentMeal,
	onSelectAlternative,
	onSkip,
	onCancel,
	cardRect,
}: MealAlternativeCarouselProps) {
	// Get 5 random alternatives
	const alternatives = useMemo(
		() => getRandomAlternatives(5, currentMeal?.main),
		[currentMeal?.main],
	);

	// Convert to events for KitchenEventCard
	const events = useMemo(
		() => alternatives.map((meal, i) => ({ event: mealToEvent(meal, i), meal })),
		[alternatives],
	);

	// Calculate card dimensions - cap width for cleaner alternatives
	const cardWidth = Math.min(cardRect.width, 180);
	const cardHeight = cardRect.height;

	// Handle escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onCancel]);

	// Render in portal to escape any container constraints
	return createPortal(
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: 50,
				overflow: "hidden",
			}}
		>
			{/* Backdrop - semi-transparent for muted effect */}
			<button
				type="button"
				onClick={onCancel}
				aria-label="Close overlay"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: "rgba(28, 25, 23, 0.8)",
					backdropFilter: "blur(2px)",
				}}
				className="animate-in fade-in duration-300"
			/>

			{/* Solid lane behind carousel with soft gradient edges */}
			<div
				style={{
					position: "fixed",
					top: cardRect.top - 48,
					left: 0,
					right: 0,
					height: cardHeight + 72,
					background: `linear-gradient(to bottom,
						transparent 0%,
						rgba(28, 25, 23, 0.95) 15%,
						rgb(28, 25, 23) 25%,
						rgb(28, 25, 23) 75%,
						rgba(28, 25, 23, 0.95) 85%,
						transparent 100%)`,
					zIndex: 5,
				}}
				className="animate-in fade-in duration-200"
			/>

			{/* Header - spans card width, Cancel at right edge */}
			<div
				className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-1 duration-200"
				style={{
					position: "fixed",
					top: cardRect.top - 28,
					left: cardRect.left,
					width: cardRect.width,
					zIndex: 20,
				}}
			>
				<div className="flex items-center gap-2">
					<span className="h-1 w-1 rounded-full bg-sage-500" />
					<span className="text-[11px] font-medium uppercase tracking-widest text-stone-500">
						Choose another
					</span>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-800/60 hover:text-stone-400"
				>
					Cancel
				</button>
			</div>

			{/* Scrollable cards row - full viewport width, horizontal only */}
			<div
				className="scrollbar-hide"
				style={{
					position: "fixed",
					top: cardRect.top,
					left: 0,
					width: "100vw",
					overflowX: "auto",
					overflowY: "hidden",
					zIndex: 10,
				}}
			>
				<div
					className="flex items-stretch gap-2.5"
					style={{
						// Skip button (56px) + gap (10px) = 66px, so first card lands at cardRect.left
						paddingLeft: Math.max(16, cardRect.left - 66),
						paddingRight: 32,
					}}
				>
					{/* Skip button - first, before alternatives */}
					<button
						type="button"
						onClick={onSkip}
						className={cn(
							"flex w-14 shrink-0 flex-col items-center justify-center gap-1.5",
							"rounded-xl border border-dashed border-stone-700 bg-stone-900/60",
							"transition-all duration-200",
							"hover:border-stone-500 hover:bg-stone-800/80",
							"animate-in fade-in slide-in-from-bottom-3 fill-mode-both",
						)}
						style={{
							height: cardHeight,
							animationDelay: "50ms",
							animationDuration: "350ms",
							animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
						}}
					>
						<svg
							className="h-4 w-4 text-stone-600"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
							aria-hidden="true"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
						</svg>
						<span className="text-[10px] font-medium uppercase tracking-wide text-stone-600">
							Skip
						</span>
					</button>

					{/* Alternative cards */}
					{events.map(({ event, meal }, index) => (
						<button
							key={event.id}
							type="button"
							onClick={() => onSelectAlternative(meal)}
							className={cn(
								"shrink-0 rounded-xl cursor-pointer",
								"transition-transform duration-200",
								"active:scale-[0.98]",
								"animate-in fade-in slide-in-from-bottom-3 fill-mode-both",
							)}
							style={{
								width: cardWidth,
								height: cardHeight,
								animationDelay: `${110 + index * 60}ms`,
								animationDuration: "350ms",
								animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
							}}
						>
							<KitchenEventCard event={event} minimal />
						</button>
					))}
				</div>
			</div>

			{/* Left edge fade */}
			<div
				className="pointer-events-none"
				style={{
					position: "fixed",
					top: cardRect.top,
					left: 0,
					width: 64,
					height: cardHeight,
					background: "linear-gradient(to right, rgba(28, 25, 23, 0.98), transparent)",
					zIndex: 20,
				}}
			/>

			{/* Right edge fade */}
			<div
				className="pointer-events-none"
				style={{
					position: "fixed",
					top: cardRect.top,
					right: 0,
					width: 64,
					height: cardHeight,
					background: "linear-gradient(to left, rgba(28, 25, 23, 0.98), transparent)",
					zIndex: 20,
				}}
			/>
		</div>,
		document.body,
	);
}
