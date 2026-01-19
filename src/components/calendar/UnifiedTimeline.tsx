// src/components/calendar/UnifiedTimeline.tsx

import {
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatHour, getDayName, getMonthDay, isToday, isTomorrow } from "@/lib/date";
import type { KitchenEvent, MealDescription } from "@/lib/mockKitchenEvents";
import {
	createEventAtTime,
	generateMockKitchenEvents,
	getEventStatus,
	getRandomAlternatives,
} from "@/lib/mockKitchenEvents";
import { getDayBounds, roundToInterval, timesOverlap } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";
import { useDebugTimeStore } from "@/stores/debugTime";
import { usePersonFilterStore } from "@/stores/personFilter";
import { DraggableEventCard } from "./DraggableEventCard";
import { KitchenEventCard } from "./KitchenEventCard";
import { MealAlternativeCarousel } from "./MealAlternativeCarousel";

interface UnifiedTimelineProps {
	onEventClick?: (event: KitchenEvent) => void;
}

export function UnifiedTimeline({ onEventClick }: UnifiedTimelineProps) {
	const personFilter = usePersonFilterStore((s) => s.filter);
	const overrideTime = useDebugTimeStore((s) => s.overrideTime);
	const [activeCarousel, setActiveCarousel] = useState<{
		eventId: string;
		top: number;
		left: number;
		width: number;
		height: number;
	} | null>(null);
	const [highlightedEventIds, setHighlightedEventIds] = useState<Set<string>>(new Set());

	// Events state (modifiable for rejection/regeneration)
	const [events, setEvents] = useState<KitchenEvent[]>(() => generateMockKitchenEvents());

	// Drag state
	const [isDragging, setIsDragging] = useState(false);
	const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
	const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
	const [isDropBlocked, setIsDropBlocked] = useState(false);
	const [_dragOriginalTime, setDragOriginalTime] = useState<number | null>(null);
	// Layout expansion state - expands gaps during drag for linear time scale
	const [isLayoutExpanded, setIsLayoutExpanded] = useState(false);
	// Preparation phase - expanding/collapsing before/after actual drag
	const [isDragPreparing, setIsDragPreparing] = useState(false);
	const [_isDropSettling, setIsDropSettling] = useState(false);

	// Refs to avoid stale closures in drag handlers
	const dragPreviewTimeRef = useRef<number | null>(null);
	const dragOriginalTimeRef = useRef<number | null>(null);
	const isDropBlockedRef = useRef(false);
	const draggedEventIdRef = useRef<string | null>(null);

	const timelineRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Configure drag sensors with activation delay (long-press)
	// Use MouseSensor + TouchSensor instead of PointerSensor because:
	// - TouchSensor can properly prevent default browser behaviors on iOS
	// - PointerSensor cannot prevent Safari's lookup/callout features
	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				delay: 300,
				tolerance: 5,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 300,
				tolerance: 5,
			},
		}),
	);

	// Alias for backwards compatibility
	const allEvents = events;

	// Handle dislike - open carousel at card position
	const handleDislike = useCallback((eventId: string, cardElement: HTMLElement) => {
		const rect = cardElement.getBoundingClientRect();
		setActiveCarousel({
			eventId,
			top: rect.top,
			left: rect.left,
			width: rect.width,
			height: rect.height,
		});
	}, []);

	// Handle selecting an alternative meal
	const handleSelectAlternative = useCallback((eventId: string, meal: MealDescription) => {
		setEvents((prev) => {
			const updated = prev.map((e) => (e.id === eventId ? { ...e, meal } : e));
			// Track meals that were "adjusted for balance" (pinned filtering done at render)
			const affectedIds = updated
				.filter((e) => e.id !== eventId && e.type === "eating")
				.map((e) => e.id);
			if (affectedIds.length > 0) {
				setHighlightedEventIds(new Set(affectedIds));
			}
			return updated;
		});
		setActiveCarousel(null);
	}, []);

	// Handle skip meal - remove from timeline
	const handleSkipMeal = useCallback((eventId: string) => {
		setEvents((prev) => {
			const updated = prev.filter((e) => e.id !== eventId);
			// Track meals that were "adjusted for balance" (pinned filtering done at render)
			const affectedIds = updated.filter((e) => e.type === "eating").map((e) => e.id);
			if (affectedIds.length > 0) {
				setHighlightedEventIds(new Set(affectedIds));
			}
			return updated;
		});
		setActiveCarousel(null);
	}, []);

	// Handle cancel - close carousel
	const handleCancelCarousel = useCallback(() => {
		setActiveCarousel(null);
	}, []);

	// Handle pin toggle
	const handlePin = useCallback((eventId: string) => {
		setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, pinned: !e.pinned } : e)));
	}, []);

	// Handle confirm toggle - also marks as done if event is past/active
	const handleConfirm = useCallback(
		(eventId: string) => {
			const now = overrideTime ?? Date.now();
			setEvents((prev) =>
				prev.map((e) => {
					if (e.id !== eventId) return e;

					const newConfirmed = !e.confirmed;
					// If confirming a past/active event, mark as done
					const isPastOrActive = e.startTime <= now;
					const newStatus = newConfirmed && isPastOrActive ? "done" : e.status;

					return { ...e, confirmed: newConfirmed, status: newStatus };
				}),
			);
		},
		[overrideTime],
	);

	// Handle undo done (long-press on done items) - stays pinned since it's past
	const handleUndoDone = useCallback((eventId: string) => {
		setEvents((prev) =>
			prev.map((e) =>
				e.id === eventId ? { ...e, status: "upcoming", confirmed: false, pinned: true } : e,
			),
		);
	}, []);

	// Handle adding a new event in a gap
	const handleAddEvent = useCallback((insertTime: number) => {
		const [randomMeal] = getRandomAlternatives(1);
		const newEvent = createEventAtTime(insertTime, "eating", "Meal", { meal: randomMeal });
		setEvents((prev) => [...prev, newEvent].sort((a, b) => a.startTime - b.startTime));
	}, []);

	// Auto-clear highlights after animation completes
	useEffect(() => {
		if (highlightedEventIds.size > 0) {
			const timer = setTimeout(() => setHighlightedEventIds(new Set()), 3000);
			return () => clearTimeout(timer);
		}
	}, [highlightedEventIds]);

	// Group events by date
	const eventsByDate = useMemo(() => {
		const grouped = new Map<string, KitchenEvent[]>();

		for (const event of allEvents) {
			const existing = grouped.get(event.date) ?? [];
			grouped.set(event.date, [...existing, event]);
		}

		// Sort events within each day by start time
		for (const [date, events] of grouped) {
			grouped.set(
				date,
				events.sort((a, b) => a.startTime - b.startTime),
			);
		}

		return grouped;
	}, [allEvents]);

	// Get current time (respects debug override)
	const currentTime = overrideTime ?? Date.now();

	// Flatten all events into a single sorted list with day boundaries
	const flattenedEvents = useMemo(() => {
		const result: Array<
			| { type: "day-separator"; date: Date; dateStr: string }
			| { type: "now-line" }
			| { type: "event"; event: KitchenEvent }
			| { type: "hour-tick"; hour: Date; label: string }
			| {
					type: "collapsed-gap";
					hours: number;
					startHour: Date;
					endHour: Date;
					nowProgress: number | null;
			  }
		> = [];

		const now = currentTime;
		let nowLineInserted = false;
		const HOUR_MS = 60 * 60 * 1000;

		// Get all events sorted by start time
		const allSortedEvents = Array.from(eventsByDate.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.flatMap(([dateStr, events]) => {
				// Filter by person
				const filtered =
					personFilter === "all"
						? events
						: events.filter((e) => e.participants.includes(personFilter));
				return filtered.map((event) => ({ event, dateStr }));
			})
			.sort((a, b) => a.event.startTime - b.event.startTime);

		// Track the last hour we've "rendered up to" (as timestamp of the hour)
		let lastRenderedHour: number | null = null;
		// Track current date for day separators (changes at midnight)
		let currentDateStr: string | null = null;

		// Get local date string (YYYY-MM-DD) for a Date
		const getLocalDateStr = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

		// Helper to add an hour tick, inserting day separator and now-line when needed
		const addHourTick = (hour: Date) => {
			const hourTime = hour.getTime();
			const hourDateStr = getLocalDateStr(hour);

			// Insert day separator when we enter a new date (at midnight)
			if (hourDateStr !== currentDateStr) {
				result.push({ type: "day-separator", date: hour, dateStr: hourDateStr });
				currentDateStr = hourDateStr;
			}

			// Insert now-line before this hour tick if now is before this hour
			if (!nowLineInserted && now < hourTime) {
				result.push({ type: "now-line" });
				nowLineInserted = true;
			}

			result.push({
				type: "hour-tick",
				hour,
				label: formatHour(hour),
			});
		};

		for (const { event } of allSortedEvents) {
			// Calculate the hour this event starts in (floor)
			const eventStartHour = Math.floor(event.startTime / HOUR_MS) * HOUR_MS;

			if (lastRenderedHour === null) {
				// Very first event - show hour tick for its starting hour
				addHourTick(new Date(eventStartHour));
				lastRenderedHour = eventStartHour;
			} else {
				// Calculate hours between last rendered hour and this event's hour
				const hoursToRender: Date[] = [];
				let h = lastRenderedHour + HOUR_MS;
				while (h <= eventStartHour) {
					hoursToRender.push(new Date(h));
					h += HOUR_MS;
				}

				if (hoursToRender.length === 0) {
					// Same hour, no ticks needed
				} else if (isLayoutExpanded) {
					// During drag (layout expanded), show ALL hour ticks (no collapse)
					for (const hour of hoursToRender) {
						addHourTick(hour);
					}
				} else if (hoursToRender.length === 1) {
					// Just one hour tick
					addHourTick(hoursToRender[0] as Date);
				} else {
					// Normal mode: collapse large gaps
					const first = hoursToRender[0] as Date;
					const last = hoursToRender[hoursToRender.length - 1] as Date;
					const firstTime = first.getTime();
					const lastTime = last.getTime();

					// Check if NOW is in this gap's time range
					// Extend ownership until the next event so NOW stays at bottom (100%)
					// rather than jumping to a standalone element after the last tick
					let nowProgress: number | null = null;
					const gapOwnsUntil = event.startTime;
					if (!nowLineInserted && now >= firstTime && now < gapOwnsUntil) {
						// Calculate progress within the visual gap (firstTime to lastTime)
						// Clamp to max 1.0 so NOW stays at bottom when past lastTime
						const rawProgress = (now - firstTime) / (lastTime - firstTime);
						nowProgress = Math.min(1, rawProgress);
						nowLineInserted = true;
					}

					addHourTick(first);

					// Check if there's a midnight in the middle (not first or last)
					const midnightInMiddle = hoursToRender.slice(1, -1).find((h) => h.getHours() === 0);

					if (midnightInMiddle) {
						// Insert day separator at midnight within the gap
						const midnightDateStr = getLocalDateStr(midnightInMiddle);
						result.push({
							type: "day-separator",
							date: midnightInMiddle,
							dateStr: midnightDateStr,
						});
						currentDateStr = midnightDateStr;
					}

					const hoursBetween = hoursToRender.length - 1;
					result.push({
						type: "collapsed-gap",
						hours: hoursBetween,
						startHour: first,
						endHour: last,
						nowProgress,
					});

					addHourTick(last);

					// Insert now-line right after the last hour tick if NOW just passed it
					if (!nowLineInserted && now >= lastTime && now < event.startTime) {
						result.push({ type: "now-line" });
						nowLineInserted = true;
					}
				}

				lastRenderedHour = eventStartHour;
			}

			// Ensure day separator appears before event if date changed
			// (handles case where no hour tick was added due to overlapping hours)
			const eventDateStr = getLocalDateStr(new Date(event.startTime));
			if (eventDateStr !== currentDateStr) {
				const eventDate = new Date(event.startTime);
				eventDate.setHours(0, 0, 0, 0); // midnight of that day
				result.push({ type: "day-separator", date: eventDate, dateStr: eventDateStr });
				currentDateStr = eventDateStr;
			}

			// Insert now line before first future event (only once)
			if (!nowLineInserted && event.startTime > now) {
				result.push({ type: "now-line" });
				nowLineInserted = true;
			}

			result.push({ type: "event", event });

			// Update lastRenderedHour to the hour containing the event's end
			const eventEndHour = Math.floor((event.endTime ?? event.startTime) / HOUR_MS) * HOUR_MS;

			// In expanded mode, show hour ticks for hours the event spans (that we haven't shown)
			if (isLayoutExpanded && lastRenderedHour !== null && eventEndHour > lastRenderedHour) {
				let h = lastRenderedHour + HOUR_MS;
				while (h <= eventEndHour) {
					addHourTick(new Date(h));
					h += HOUR_MS;
				}
			}

			if (eventEndHour > lastRenderedHour) {
				lastRenderedHour = eventEndHour;
			}
		}

		// After last event, always show the next hour tick
		if (lastRenderedHour !== null && allSortedEvents.length > 0) {
			const lastEventEntry = allSortedEvents[allSortedEvents.length - 1];
			if (!lastEventEntry) return result;
			const lastEvent = lastEventEntry.event;
			const endTime = lastEvent.endTime ?? lastEvent.startTime;
			// Always get the NEXT full hour after the event ends
			const nextHour = (Math.floor(endTime / HOUR_MS) + 1) * HOUR_MS;
			// Only add if it's a different hour than last rendered
			if (nextHour > lastRenderedHour) {
				addHourTick(new Date(nextHour));
			}
		}

		// If now line wasn't inserted (all events in past), add at end
		if (!nowLineInserted && allSortedEvents.length > 0) {
			result.push({ type: "now-line" });
		}

		return result;
	}, [eventsByDate, personFilter, isLayoutExpanded, currentTime]);

	// No special positioning during drag - just unfold gaps (handled in flattenedEvents)

	// Animation duration for expand/collapse (must match CSS duration-700)
	const ANIMATION_DURATION = 700;

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const eventId = event.active.id as string;
			const draggedEvent = events.find((e) => e.id === eventId);
			if (!draggedEvent) return;

			// Capture card's viewport position for scroll anchoring
			const cardElement = document.querySelector(
				`[data-draggable-event-id="${eventId}"]`,
			) as HTMLElement | null;
			if (!cardElement) {
				return;
			}

			const initialY = cardElement.getBoundingClientRect().top;

			// Start preparation phase - expand animation plays, DragOverlay hidden
			setIsDragPreparing(true);
			setIsLayoutExpanded(true);

			// Set drag info immediately so card shows preview time during preparation
			setDraggedEventId(eventId);
			setDragOriginalTime(draggedEvent.startTime);
			setDragPreviewTime(draggedEvent.startTime); // Initialize to original time
			draggedEventIdRef.current = eventId;
			dragOriginalTimeRef.current = draggedEvent.startTime;
			dragPreviewTimeRef.current = draggedEvent.startTime;

			// Continuously adjust scroll during animation to keep card in place
			const startTime = performance.now();

			const adjustScroll = () => {
				// Check if drag was cancelled - if ref was cleared, stop the animation
				if (draggedEventIdRef.current !== eventId) {
					return;
				}

				const card = document.querySelector(
					`[data-draggable-event-id="${eventId}"]`,
				) as HTMLElement | null;

				if (card && scrollContainerRef.current) {
					const currentY = card.getBoundingClientRect().top;
					const delta = currentY - initialY;
					if (Math.abs(delta) > 0.5) {
						scrollContainerRef.current.scrollTop += delta;
					}
				}

				const elapsed = performance.now() - startTime;
				if (elapsed < ANIMATION_DURATION) {
					requestAnimationFrame(adjustScroll);
				} else {
					// Animation complete - start actual drag (only if still preparing)
					if (draggedEventIdRef.current === eventId) {
						setIsDragPreparing(false);
						setIsDragging(true);
					}
				}
			};

			requestAnimationFrame(adjustScroll);
		},
		[events],
	);

	// Height per hour in the timeline during drag (matches expanded hour tick height)
	const HOUR_TICK_HEIGHT = 60;

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			// Skip time calculation during preparation phase - positions are unstable
			// due to the expand animation. Wait until animation completes.
			if (isDragPreparing) {
				return;
			}

			const eventId = event.active.id as string;
			const originalTime = dragOriginalTimeRef.current;
			if (!originalTime) {
				return;
			}

			const draggedEvent = events.find((e) => e.id === eventId);
			if (!draggedEvent) {
				return;
			}

			const { dayStart, dayEnd } = getDayBounds(draggedEvent.startTime);
			const HOUR_MS = 60 * 60 * 1000;

			if (!timelineRef.current) return;

			// Get the overlay's actual position from dnd-kit.
			// Use translated rect (where overlay actually is), falling back to initial + delta.
			const translatedRect = event.active.rect.current.translated;
			const initialRect = event.active.rect.current.initial;

			let overlayTop: number;
			if (translatedRect) {
				overlayTop = translatedRect.top;
			} else if (initialRect) {
				// Fallback: initial position + delta
				overlayTop = initialRect.top + (event.delta.y ?? 0);
			} else {
				return;
			}

			// Add DOT_OFFSET to align the timeline DOT CENTER with hour ticks.
			// The dot's outer div is at `top-5` (20px) with height `h-2.5` (10px),
			// and the inner dot is centered inside, so dot center = 20px + 5px = 25px.
			const DOT_OFFSET = 25;
			const overlayY = overlayTop + DOT_OFFSET;

			// Find all hour tick elements and their positions
			const hourTicks = Array.from(
				timelineRef.current.querySelectorAll("[data-timeline-hour-tick]"),
			) as HTMLElement[];

			let newTime: number;
			let tickAbove: { time: number; y: number } | null = null;
			let tickBelow: { time: number; y: number } | null = null;

			if (hourTicks.length === 0) {
				// Fallback: use delta-based calculation
				const deltaHours = (event.delta.y ?? 0) / HOUR_TICK_HEIGHT;
				newTime = originalTime + deltaHours * HOUR_MS;
			} else {
				// Find the hour tick just above and below the overlay position
				for (const tick of hourTicks) {
					const rect = tick.getBoundingClientRect();
					const tickY = rect.top + rect.height / 2;
					const tickTime = Number.parseInt(tick.getAttribute("data-timeline-hour-tick") ?? "0", 10);

					if (tickY <= overlayY) {
						if (!tickAbove || tickY > tickAbove.y) {
							tickAbove = { time: tickTime, y: tickY };
						}
					}
					if (tickY >= overlayY) {
						if (!tickBelow || tickY < tickBelow.y) {
							tickBelow = { time: tickTime, y: tickY };
						}
					}
				}

				if (tickAbove && tickBelow && tickAbove.y !== tickBelow.y) {
					// Interpolate between the two ticks
					const totalDistance = tickBelow.y - tickAbove.y;
					const offset = overlayY - tickAbove.y;
					const fraction = offset / totalDistance;
					const timeDiff = tickBelow.time - tickAbove.time;
					newTime = tickAbove.time + fraction * timeDiff;
				} else if (tickAbove) {
					// Below all ticks - extrapolate
					const pixelsBelow = overlayY - tickAbove.y;
					const hoursBelow = pixelsBelow / HOUR_TICK_HEIGHT;
					newTime = tickAbove.time + hoursBelow * HOUR_MS;
				} else if (tickBelow) {
					// Above all ticks - extrapolate
					const pixelsAbove = tickBelow.y - overlayY;
					const hoursAbove = pixelsAbove / HOUR_TICK_HEIGHT;
					newTime = tickBelow.time - hoursAbove * HOUR_MS;
				} else {
					newTime = originalTime;
				}
			}

			newTime = roundToInterval(newTime, 5);
			newTime = Math.max(dayStart, Math.min(newTime, dayEnd));

			// Calculate event duration
			const duration = (draggedEvent.endTime ?? draggedEvent.startTime) - draggedEvent.startTime;
			const newEndTime = newTime + duration;

			// Check for overlaps with other events
			const hasOverlap = events.some((e) => {
				if (e.id === eventId) return false;
				const sharedParticipants = e.participants.some((p) =>
					draggedEvent.participants.includes(p),
				);
				if (!sharedParticipants) return false;
				return timesOverlap(newTime, newEndTime, e.startTime, e.endTime ?? e.startTime);
			});

			setDragPreviewTime(newTime);
			dragPreviewTimeRef.current = newTime;
			setIsDropBlocked(hasOverlap);
			isDropBlockedRef.current = hasOverlap;
		},
		[events, isDragPreparing],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const eventId = event.active.id as string;

			// If still in preparation phase, just cancel and clean up all state
			if (isDragPreparing) {
				setIsDragPreparing(false);
				setIsLayoutExpanded(false);
				setDraggedEventId(null);
				setDragPreviewTime(null);
				setIsDropBlocked(false);
				setDragOriginalTime(null);
				draggedEventIdRef.current = null;
				dragOriginalTimeRef.current = null;
				dragPreviewTimeRef.current = null;
				isDropBlockedRef.current = false;
				return;
			}

			// Read from refs to avoid stale closure issues
			const previewTime = dragPreviewTimeRef.current;
			const originalTime = dragOriginalTimeRef.current;
			const blocked = isDropBlockedRef.current;

			// Check if event actually moved (time changed)
			const eventActuallyMoved =
				!blocked && previewTime !== null && originalTime !== null && previewTime !== originalTime;

			// If drop is not blocked and we have a preview time, update the event
			if (eventActuallyMoved) {
				setEvents((prev) =>
					prev.map((e) => {
						if (e.id !== eventId) return e;

						const duration = (e.endTime ?? e.startTime) - e.startTime;
						// Update date field to match new startTime
						const newDate = new Date(previewTime);
						const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;
						return {
							...e,
							startTime: previewTime,
							endTime: e.endTime ? previewTime + duration : null,
							date: dateStr,
						};
					}),
				);
			}

			// Hide DragOverlay immediately, show the card
			setIsDragging(false);
			setDraggedEventId(null);
			setDragPreviewTime(null);
			setIsDropBlocked(false);
			setDragOriginalTime(null);

			// Reset refs
			dragPreviewTimeRef.current = null;
			dragOriginalTimeRef.current = null;
			isDropBlockedRef.current = false;

			// Wait for React to re-render, then start collapse
			// Double rAF ensures we measure after React's commit phase
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const cardElement = document.querySelector(
						`[data-draggable-event-id="${eventId}"]`,
					) as HTMLElement | null;
					if (!cardElement) {
						setIsLayoutExpanded(false);
						draggedEventIdRef.current = null;
						return;
					}

					const initialY = cardElement.getBoundingClientRect().top;

					// Start settling phase - collapse animation with scroll adjustment
					setIsDropSettling(true);
					setIsLayoutExpanded(false);

					// Continuously adjust scroll during collapse animation
					const startTime = performance.now();

					const adjustScroll = () => {
						const card = document.querySelector(
							`[data-draggable-event-id="${eventId}"]`,
						) as HTMLElement | null;

						if (card && scrollContainerRef.current) {
							const currentY = card.getBoundingClientRect().top;
							const delta = currentY - initialY;
							if (Math.abs(delta) > 0.5) {
								scrollContainerRef.current.scrollTop += delta;
							}
						}

						const elapsed = performance.now() - startTime;
						if (elapsed < ANIMATION_DURATION) {
							requestAnimationFrame(adjustScroll);
						} else {
							setIsDropSettling(false);
							draggedEventIdRef.current = null;
						}
					};

					requestAnimationFrame(adjustScroll);
				});
			});
		},
		[isDragPreparing],
	);

	const handleDragCancel = useCallback(() => {
		const eventId = draggedEventIdRef.current;

		// If still in preparation phase, just reset and clean up all state
		if (isDragPreparing) {
			setIsDragPreparing(false);
			setIsLayoutExpanded(false);
			setDraggedEventId(null);
			setDragPreviewTime(null);
			setIsDropBlocked(false);
			setDragOriginalTime(null);
			draggedEventIdRef.current = null;
			dragOriginalTimeRef.current = null;
			dragPreviewTimeRef.current = null;
			isDropBlockedRef.current = false;
			return;
		}

		// Hide DragOverlay immediately
		setIsDragging(false);
		setDraggedEventId(null);
		setDragPreviewTime(null);
		setIsDropBlocked(false);
		setDragOriginalTime(null);

		// Reset refs
		dragPreviewTimeRef.current = null;
		dragOriginalTimeRef.current = null;
		isDropBlockedRef.current = false;

		if (!eventId) {
			setIsLayoutExpanded(false);
			draggedEventIdRef.current = null;
			return;
		}

		// Wait for React to re-render, then start collapse
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const cardElement = document.querySelector(
					`[data-draggable-event-id="${eventId}"]`,
				) as HTMLElement | null;
				if (!cardElement) {
					setIsLayoutExpanded(false);
					draggedEventIdRef.current = null;
					return;
				}

				const initialY = cardElement.getBoundingClientRect().top;

				// Start settling phase - collapse animation with scroll adjustment
				setIsDropSettling(true);
				setIsLayoutExpanded(false);

				// Continuously adjust scroll during collapse animation
				const startTime = performance.now();

				const adjustScroll = () => {
					const card = document.querySelector(
						`[data-draggable-event-id="${eventId}"]`,
					) as HTMLElement | null;

					if (card && scrollContainerRef.current) {
						const currentY = card.getBoundingClientRect().top;
						const delta = currentY - initialY;
						if (Math.abs(delta) > 0.5) {
							scrollContainerRef.current.scrollTop += delta;
						}
					}

					const elapsed = performance.now() - startTime;
					if (elapsed < ANIMATION_DURATION) {
						requestAnimationFrame(adjustScroll);
					} else {
						setIsDropSettling(false);
						draggedEventIdRef.current = null;
					}
				};

				requestAnimationFrame(adjustScroll);
			});
		});
	}, [isDragPreparing]);

	return (
		<DndContext
			sensors={sensors}
			modifiers={[restrictToVerticalAxis]}
			onDragStart={handleDragStart}
			onDragMove={handleDragMove}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<div ref={scrollContainerRef} className="h-full overflow-y-auto">
				{/* Timeline content */}
				<div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6">
					{/* Single column layout - sticky rows use negative margin for labels */}
					<div className="relative pl-10">
						{/* Timeline track - vertical line */}
						<div
							className="absolute w-px bg-stone-700"
							style={{ left: "calc(2.5rem + 5px)", top: 0, bottom: "8rem" }}
						/>

						<div ref={timelineRef} className="relative flex flex-col pb-32">
							{flattenedEvents.map((item, index) => {
								// Calculate time-based spacing to next event
								const getTimeGapSpacing = () => {
									const nextItem = flattenedEvents[index + 1];
									// If next item is hour-tick or collapsed-gap, use minimal spacing
									// (the tick/gap component handles the visual gap)
									if (nextItem?.type === "hour-tick" || nextItem?.type === "collapsed-gap") {
										return 4;
									}
									// For consecutive events without hour boundaries, use small fixed gap
									return 8;
								};

								const gapPx = getTimeGapSpacing();

								if (item.type === "day-separator") {
									const today = isToday(item.date);
									const tomorrow = isTomorrow(item.date);
									const dayLabel = today ? "Today" : tomorrow ? "Tomorrow" : getDayName(item.date);

									return (
										<div
											key={`day-${item.dateStr}`}
											id={`day-${item.dateStr}`}
											className="relative flex items-center pt-4 pb-2"
										>
											{/* Day label - absolute positioned in margin, doesn't affect flow */}
											<div className="absolute right-full pr-2 flex flex-col items-end select-none">
												<button
													type="button"
													onClick={() => {
														const element = document.getElementById(`day-${item.dateStr}`);
														element?.scrollIntoView({ behavior: "smooth", block: "start" });
													}}
													className={cn(
														"font-semibold tracking-tight text-right whitespace-nowrap rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-400",
														today
															? "text-sm text-stone-100 hover:text-stone-50"
															: tomorrow
																? "text-xs text-stone-300 hover:text-stone-200"
																: "text-xs text-stone-500 hover:text-stone-400",
													)}
												>
													{dayLabel}
												</button>
												<span className="text-[10px] text-stone-600">{getMonthDay(item.date)}</span>
											</div>

											{/* Dot + line */}
											<div className="flex h-2.5 w-2.5 shrink-0 items-center justify-center">
												<div
													className={cn(
														"h-2.5 w-2.5 rounded-full",
														today ? "bg-sage-500" : "bg-stone-600",
													)}
												/>
											</div>
											<div className="ml-2 h-px flex-1 bg-gradient-to-r from-stone-700 to-transparent" />
										</div>
									);
								}

								if (item.type === "now-line") {
									const nowDate = new Date(currentTime);
									const timeStr = nowDate.toLocaleTimeString("en-US", {
										hour: "numeric",
										minute: "2-digit",
										hour12: true,
									});

									return (
										<div key="now-line" id="now-line" className="flex items-center py-2">
											{/* Time label in margin - scrolls with line */}
											<div className="-ml-10 w-10 shrink-0 pr-2 flex items-center justify-end select-none">
												<span className="font-medium tabular-nums text-terra-400 text-xs tracking-wide whitespace-nowrap">
													{timeStr}
												</span>
											</div>

											{/* Pulsing dot on timeline */}
											<div className="relative flex h-3 w-3 items-center justify-center">
												<div className="absolute h-3 w-3 animate-ping rounded-full bg-terra-500/40" />
												<div className="h-2.5 w-2.5 rounded-full bg-terra-500 shadow-[0_0_8px_rgba(201,118,83,0.5)]" />
											</div>

											{/* Line extends to edge */}
											<div className="ml-2 h-px flex-1 bg-gradient-to-r from-terra-500 to-transparent" />
										</div>
									);
								}

								if (item.type === "hour-tick") {
									// Use larger height during drag for uniform scale
									const tickHeight = isLayoutExpanded ? 60 : 32;
									return (
										<div
											key={`hour-${item.hour.getTime()}`}
											data-timeline-hour-tick={item.hour.getTime()}
											className="relative flex items-center transition-[height] duration-700"
											style={{
												height: `${tickHeight}px`,
												transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
											}}
										>
											{/* Hour label in margin - select-none prevents Safari lookup */}
											<div className="absolute right-full pr-3 flex items-center justify-end select-none">
												<span className="text-xs text-stone-600 tabular-nums whitespace-nowrap">
													{item.label}
												</span>
											</div>
											{/* Tick mark extending left from timeline -| shape, centered vertically */}
											<div
												className="absolute top-1/2 h-px -translate-y-1/2 bg-stone-600"
												style={{ right: "calc(100% - 5px)", width: "6px" }}
											/>
										</div>
									);
								}

								if (item.type === "collapsed-gap") {
									const nowTimeStr =
										item.nowProgress !== null
											? new Date(currentTime).toLocaleTimeString("en-US", {
													hour: "numeric",
													minute: "2-digit",
													hour12: true,
												})
											: null;

									return (
										<div
											key={`gap-${item.startHour.getTime()}`}
											data-timeline-collapsed-gap={item.hours}
											className="relative flex items-center justify-center"
											style={{ height: "40px" }}
										>
											{/* Cover the solid timeline with background */}
											<div
												className="absolute top-0 bottom-0 bg-stone-950"
												style={{ left: "4px", width: "3px" }}
											/>
											{/* Dashed line segment */}
											<div
												className="absolute top-0 bottom-0 border-l border-dashed border-stone-600"
												style={{ left: "5px" }}
											/>

											{/* NOW indicator within collapsed gap - centered on progress point */}
											{item.nowProgress !== null && (
												<div
													className="absolute left-0 right-0 flex items-center -translate-y-1/2"
													style={{ top: `${item.nowProgress * 100}%` }}
												>
													{/* Time label */}
													<div className="-ml-10 w-10 shrink-0 pr-2 flex items-center justify-end select-none">
														<span className="font-medium tabular-nums text-terra-400 text-xs tracking-wide whitespace-nowrap">
															{nowTimeStr}
														</span>
													</div>
													{/* Pulsing dot */}
													<div className="relative flex h-3 w-3 items-center justify-center">
														<div className="absolute h-3 w-3 animate-ping rounded-full bg-terra-500/40" />
														<div className="h-2.5 w-2.5 rounded-full bg-terra-500 shadow-[0_0_8px_rgba(201,118,83,0.5)]" />
													</div>
													{/* Line extends to edge */}
													<div className="ml-2 h-px flex-1 bg-gradient-to-r from-terra-500 to-transparent" />
												</div>
											)}

											{/* Gap label */}
											<span className="pl-4 text-[10px] text-stone-500 tabular-nums select-none">
												{item.hours}h
											</span>
										</div>
									);
								}

								const event = item.event;
								const isCarouselOpen = activeCarousel?.eventId === event.id;
								const shouldDim = activeCarousel !== null && !isCarouselOpen;

								return (
									<div
										key={event.id}
										data-event-id={event.id}
										className={cn(
											"group/slot relative w-full",
											shouldDim && "opacity-40 pointer-events-none transition-opacity duration-300",
										)}
										style={{
											marginBottom: `${gapPx}px`,
										}}
									>
										{/* Event card with integrated timeline dot */}
										<div className="relative w-full pl-5">
											<DraggableEventCard
												event={event}
												isDragging={isDragging}
												isBeingDragged={isDragging && draggedEventId === event.id}
												previewTime={draggedEventId === event.id ? dragPreviewTime : null}
												isBlocked={draggedEventId === event.id && isDropBlocked}
												disabled={getEventStatus(event, currentTime) === "done"}
												onClick={() => onEventClick?.(event)}
												onPin={() => handlePin(event.id)}
												onConfirm={() => handleConfirm(event.id)}
												onUndoDone={() => handleUndoDone(event.id)}
												onDislike={(e) => {
													// Find the parent card (div with role="button", not an actual <button>)
													const card = e.currentTarget.parentElement?.closest('[role="button"]');
													if (card) handleDislike(event.id, card as HTMLElement);
												}}
												highlighted={
													highlightedEventIds.has(event.id) &&
													!event.pinned &&
													getEventStatus(event, currentTime) !== "done"
												}
												dotColorClass={
													getEventStatus(event, currentTime) === "done"
														? "bg-stone-600"
														: getEventStatus(event, currentTime) === "overdue"
															? "bg-terra-500"
															: getEventStatus(event, currentTime) === "active"
																? "bg-sage-500"
																: event.confirmed
																	? "bg-sage-600"
																	: event.pinned
																		? "bg-stone-500"
																		: "bg-stone-700"
												}
												now={currentTime}
											/>
										</div>

										{/* Add unplanned - dot centered in gap */}
										{(flattenedEvents[index + 1]?.type === "hour-tick" ||
											flattenedEvents[index + 1]?.type === "collapsed-gap") && (
											<button
												type="button"
												onClick={() => {
													// Calculate insertion time at midpoint of gap
													const currentEnd = event.endTime ?? event.startTime;
													const nextItem = flattenedEvents[index + 1];
													const nextStart =
														nextItem?.type === "event"
															? nextItem.event.startTime
															: currentEnd + 30 * 60000; // 30 mins default
													const insertTime = currentEnd + (nextStart - currentEnd) / 2;
													handleAddEvent(insertTime);
												}}
												className="group/add absolute left-0 flex h-11 w-11 -translate-x-[17px] -translate-y-1/2 items-center justify-center"
												style={{ top: `calc(100% + ${gapPx / 2}px)` }}
												aria-label="Add unplanned"
											>
												<div className="h-2 w-2 rounded-full border border-dashed border-stone-600 bg-stone-900 transition-all group-hover/add:border-solid group-hover/add:border-stone-500 group-hover/add:bg-stone-700 group-active/add:bg-stone-600" />
											</button>
										)}
									</div>
								);
							})}

							{/* Trailing add button - after last event */}
							{flattenedEvents.length > 0 && (
								<div className="relative w-full pl-5 pt-4">
									{/* Timeline node */}
									<div className="absolute left-0 top-4 flex h-2.5 w-2.5 items-center justify-center">
										<button
											type="button"
											onClick={() => {
												// Find last event's end time
												const lastEventItem = [...flattenedEvents]
													.reverse()
													.find((item) => item.type === "event");
												const lastEnd =
													lastEventItem?.type === "event"
														? (lastEventItem.event.endTime ?? lastEventItem.event.startTime)
														: currentTime;
												// Add 30 mins after last event
												handleAddEvent(lastEnd + 30 * 60000);
											}}
											className="group/add flex h-11 w-11 -translate-x-[17px] items-center justify-center"
											aria-label="Add event"
										>
											<div className="h-2 w-2 rounded-full border border-dashed border-stone-600 bg-stone-900 transition-all group-hover/add:border-solid group-hover/add:border-stone-500 group-hover/add:bg-stone-700 group-active/add:bg-stone-600" />
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Bottom fade overlay */}
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950 to-transparent" />
				</div>

				{/* Carousel overlay */}
				{activeCarousel &&
					(() => {
						const activeEvent = events.find((e) => e.id === activeCarousel.eventId);
						if (!activeEvent) return null;
						return (
							<MealAlternativeCarousel
								currentMeal={activeEvent.meal}
								onSelectAlternative={(meal) =>
									handleSelectAlternative(activeCarousel.eventId, meal)
								}
								onSkip={() => handleSkipMeal(activeCarousel.eventId)}
								onCancel={handleCancelCarousel}
								cardRect={{
									top: activeCarousel.top,
									left: activeCarousel.left,
									width: activeCarousel.width,
									height: activeCarousel.height,
								}}
							/>
						);
					})()}
			</div>

			{/* Drag overlay - renders a copy of the card that follows the pointer */}
			<DragOverlay modifiers={[restrictToVerticalAxis]}>
				{isDragging &&
					draggedEventId &&
					(() => {
						const draggedEvent = events.find((e) => e.id === draggedEventId);
						if (!draggedEvent) return null;
						const dotColor =
							getEventStatus(draggedEvent, currentTime) === "done"
								? "bg-stone-600"
								: getEventStatus(draggedEvent, currentTime) === "overdue"
									? "bg-terra-500"
									: getEventStatus(draggedEvent, currentTime) === "active"
										? "bg-sage-500"
										: draggedEvent.confirmed
											? "bg-sage-600"
											: draggedEvent.pinned
												? "bg-stone-500"
												: "bg-stone-700";
						return (
							<div className="relative shadow-2xl">
								{/* Timeline dot - matches DraggableEventCard positioning */}
								<div className="absolute -left-5 top-5 flex h-2.5 w-2.5 items-center justify-center">
									<div className={cn("h-2 w-2 rounded-full", dotColor)} />
								</div>
								{/* Solid background behind the card to prevent seeing through */}
								<div className="rounded-xl bg-stone-950">
									<KitchenEventCard
										event={draggedEvent}
										previewTime={dragPreviewTime}
										now={currentTime}
									/>
								</div>
							</div>
						);
					})()}
			</DragOverlay>
		</DndContext>
	);
}
