# Timeline Drag-and-Drop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to drag event cards to reschedule meals, with timeline expanding to linear scale during drag.

**Architecture:** Wrap timeline in dnd-kit's DndContext. Cards become draggable via useDraggable hook. On drag start, timeline expands to linear 60px/hour scale. Position calculated from cursor Y offset. Collision detection prevents overlaps. On drop, update event timestamps.

**Tech Stack:** @dnd-kit/core, @dnd-kit/utilities, React state, CSS transitions

---

## Task 1: Install dnd-kit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run:
```bash
bun add @dnd-kit/core @dnd-kit/utilities
```

**Step 2: Verify installation**

Run: `bun check`
Expected: No errors

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add @dnd-kit dependencies"
```

---

## Task 2: Create Time Utilities

**Files:**
- Create: `src/lib/timeUtils.ts`
- Create: `src/lib/timeUtils.test.ts`

**Step 1: Write tests for time utilities**

Create `src/lib/timeUtils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { roundToInterval, timesOverlap, getDayBounds } from "./timeUtils";

describe("roundToInterval", () => {
	it("rounds down to nearest 5 minutes", () => {
		// 10:02 AM -> 10:00 AM
		const time = new Date("2026-01-17T10:02:00").getTime();
		const rounded = roundToInterval(time, 5);
		expect(new Date(rounded).getMinutes()).toBe(0);
	});

	it("rounds up when past halfway", () => {
		// 10:03 AM -> 10:05 AM
		const time = new Date("2026-01-17T10:03:00").getTime();
		const rounded = roundToInterval(time, 5);
		expect(new Date(rounded).getMinutes()).toBe(5);
	});
});

describe("timesOverlap", () => {
	const base = new Date("2026-01-17T10:00:00").getTime();
	const hour = 60 * 60 * 1000;

	it("returns true for overlapping ranges", () => {
		// 10:00-11:00 overlaps with 10:30-11:30
		expect(timesOverlap(base, base + hour, base + hour / 2, base + hour * 1.5)).toBe(true);
	});

	it("returns false for non-overlapping ranges", () => {
		// 10:00-11:00 does not overlap with 12:00-13:00
		expect(timesOverlap(base, base + hour, base + hour * 2, base + hour * 3)).toBe(false);
	});

	it("returns false for adjacent ranges", () => {
		// 10:00-11:00 does not overlap with 11:00-12:00 (touching is ok)
		expect(timesOverlap(base, base + hour, base + hour, base + hour * 2)).toBe(false);
	});
});

describe("getDayBounds", () => {
	it("returns start and end of day for timestamp", () => {
		const time = new Date("2026-01-17T14:30:00").getTime();
		const { dayStart, dayEnd } = getDayBounds(time);

		expect(new Date(dayStart).getHours()).toBe(0);
		expect(new Date(dayStart).getMinutes()).toBe(0);
		expect(new Date(dayEnd).getHours()).toBe(23);
		expect(new Date(dayEnd).getMinutes()).toBe(59);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/timeUtils.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement time utilities**

Create `src/lib/timeUtils.ts`:

```typescript
const MINUTE_MS = 60 * 1000;

/**
 * Round timestamp to nearest interval (in minutes).
 * @param time - timestamp in milliseconds
 * @param intervalMinutes - interval to round to (e.g., 5 for 5-minute increments)
 */
export function roundToInterval(time: number, intervalMinutes: number): number {
	const intervalMs = intervalMinutes * MINUTE_MS;
	return Math.round(time / intervalMs) * intervalMs;
}

/**
 * Check if two time ranges overlap.
 * Adjacent ranges (end1 === start2) do NOT overlap.
 */
export function timesOverlap(
	start1: number,
	end1: number,
	start2: number,
	end2: number,
): boolean {
	return start1 < end2 && end1 > start2;
}

/**
 * Get the start and end timestamps for the day containing the given timestamp.
 */
export function getDayBounds(time: number): { dayStart: number; dayEnd: number } {
	const date = new Date(time);
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);

	const dayEnd = new Date(date);
	dayEnd.setHours(23, 59, 59, 999);

	return { dayStart: dayStart.getTime(), dayEnd: dayEnd.getTime() };
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/timeUtils.test.ts`
Expected: PASS (3 test suites)

**Step 5: Commit**

```bash
git add src/lib/timeUtils.ts src/lib/timeUtils.test.ts
git commit -m "feat(dnd): add time utilities for rounding and overlap detection"
```

---

## Task 3: Create Position Calculator

**Files:**
- Create: `src/lib/timelinePosition.ts`
- Create: `src/lib/timelinePosition.test.ts`

**Step 1: Write tests**

Create `src/lib/timelinePosition.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { timeToLinearY, linearYToTime, PX_PER_HOUR } from "./timelinePosition";

describe("timeToLinearY", () => {
	const dayStart = new Date("2026-01-17T00:00:00").getTime();

	it("returns 0 for start of day", () => {
		expect(timeToLinearY(dayStart, dayStart)).toBe(0);
	});

	it("returns PX_PER_HOUR for 1 hour after start", () => {
		const oneHourLater = dayStart + 60 * 60 * 1000;
		expect(timeToLinearY(oneHourLater, dayStart)).toBe(PX_PER_HOUR);
	});

	it("returns proportional value for mid-hour", () => {
		const thirtyMinutes = dayStart + 30 * 60 * 1000;
		expect(timeToLinearY(thirtyMinutes, dayStart)).toBe(PX_PER_HOUR / 2);
	});
});

describe("linearYToTime", () => {
	const dayStart = new Date("2026-01-17T00:00:00").getTime();

	it("returns dayStart for y=0", () => {
		expect(linearYToTime(0, dayStart)).toBe(dayStart);
	});

	it("returns 1 hour later for y=PX_PER_HOUR", () => {
		const expected = dayStart + 60 * 60 * 1000;
		expect(linearYToTime(PX_PER_HOUR, dayStart)).toBe(expected);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/timelinePosition.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement position calculator**

Create `src/lib/timelinePosition.ts`:

```typescript
export const PX_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Convert a timestamp to Y position in linear (expanded) timeline.
 * @param time - event timestamp
 * @param dayStart - start of the day (midnight) timestamp
 * @returns Y position in pixels from top of day
 */
export function timeToLinearY(time: number, dayStart: number): number {
	const msFromStart = time - dayStart;
	return (msFromStart / HOUR_MS) * PX_PER_HOUR;
}

/**
 * Convert Y position back to timestamp.
 * @param y - Y position in pixels
 * @param dayStart - start of the day timestamp
 * @returns timestamp
 */
export function linearYToTime(y: number, dayStart: number): number {
	const msFromStart = (y / PX_PER_HOUR) * HOUR_MS;
	return dayStart + msFromStart;
}
```

**Step 4: Run tests**

Run: `bun test src/lib/timelinePosition.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/timelinePosition.ts src/lib/timelinePosition.test.ts
git commit -m "feat(dnd): add timeline position calculator for linear mode"
```

---

## Task 4: Add Drag State to UnifiedTimeline

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:22-35`

**Step 1: Add drag state variables**

After the existing state declarations (around line 34), add:

```typescript
// Drag state
const [isDragging, setIsDragging] = useState(false);
const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
const [isDropBlocked, setIsDropBlocked] = useState(false);
```

**Step 2: Verify it compiles**

Run: `bun check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): add drag state to UnifiedTimeline"
```

---

## Task 5: Wrap Timeline in DndContext

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Add imports at top of file**

```typescript
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragMoveEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
```

**Step 2: Add sensor configuration after state declarations**

```typescript
// Configure drag sensor with activation delay (long-press)
const sensors = useSensors(
	useSensor(PointerSensor, {
		activationConstraint: {
			delay: 300,
			tolerance: 5,
		},
	}),
);
```

**Step 3: Add drag event handlers before the return statement**

```typescript
const handleDragStart = useCallback((event: DragStartEvent) => {
	const eventId = event.active.id as string;
	setDraggedEventId(eventId);
	setIsDragging(true);
}, []);

const handleDragMove = useCallback((event: DragMoveEvent) => {
	// Will implement position calculation in next task
}, []);

const handleDragEnd = useCallback((event: DragEndEvent) => {
	setIsDragging(false);
	setDraggedEventId(null);
	setDragPreviewTime(null);
	setIsDropBlocked(false);
	// Will implement time update in later task
}, []);

const handleDragCancel = useCallback(() => {
	setIsDragging(false);
	setDraggedEventId(null);
	setDragPreviewTime(null);
	setIsDropBlocked(false);
}, []);
```

**Step 4: Wrap timeline content in DndContext**

Find the opening `<div className="h-full overflow-y-auto">` and wrap the content:

```typescript
return (
	<DndContext
		sensors={sensors}
		onDragStart={handleDragStart}
		onDragMove={handleDragMove}
		onDragEnd={handleDragEnd}
		onDragCancel={handleDragCancel}
	>
		<div className="h-full overflow-y-auto">
			{/* existing content unchanged */}
		</div>
	</DndContext>
);
```

**Step 5: Verify it compiles**

Run: `bun check`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): wrap timeline in DndContext with pointer sensor"
```

---

## Task 6: Create DraggableEventCard Wrapper

**Files:**
- Create: `src/components/calendar/DraggableEventCard.tsx`

**Step 1: Create the draggable wrapper component**

```typescript
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { KitchenEvent } from "@/lib/mockKitchenEvents";
import { cn } from "@/lib/utils";
import { KitchenEventCard } from "./KitchenEventCard";

interface DraggableEventCardProps {
	event: KitchenEvent;
	isDragging: boolean;
	isBeingDragged: boolean;
	previewTime: number | null;
	isBlocked: boolean;
	onClick?: () => void;
	onPin?: () => void;
	onConfirm?: () => void;
	onUndoDone?: () => void;
	onDislike?: (e: React.MouseEvent) => void;
	highlighted?: boolean;
}

export function DraggableEventCard({
	event,
	isDragging,
	isBeingDragged,
	previewTime,
	isBlocked,
	onClick,
	onPin,
	onConfirm,
	onUndoDone,
	onDislike,
	highlighted,
}: DraggableEventCardProps) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: event.id,
		data: { event },
	});

	const style = transform
		? {
				transform: CSS.Transform.toString(transform),
				zIndex: 50,
			}
		: undefined;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"touch-none",
				isBeingDragged && "opacity-90 shadow-xl",
				isBeingDragged && isBlocked && "ring-2 ring-red-500/50",
			)}
			{...listeners}
			{...attributes}
		>
			<KitchenEventCard
				event={event}
				onClick={onClick}
				onPin={onPin}
				onConfirm={onConfirm}
				onUndoDone={onUndoDone}
				onDislike={onDislike}
				highlighted={highlighted}
				previewTime={isBeingDragged ? previewTime : null}
			/>
		</div>
	);
}
```

**Step 2: Add previewTime prop to KitchenEventCard**

Modify `src/components/calendar/KitchenEventCard.tsx`. Add to props interface:

```typescript
previewTime?: number | null;
```

In the time display section, use previewTime if provided:

```typescript
const displayTime = previewTime ?? event.startTime;
```

**Step 3: Verify it compiles**

Run: `bun check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/calendar/DraggableEventCard.tsx src/components/calendar/KitchenEventCard.tsx
git commit -m "feat(dnd): create DraggableEventCard wrapper component"
```

---

## Task 7: Integrate DraggableEventCard into Timeline

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:525-580`

**Step 1: Import the new component**

```typescript
import { DraggableEventCard } from "./DraggableEventCard";
```

**Step 2: Replace KitchenEventCard with DraggableEventCard in the event render**

Find the event card rendering (around line 560) and replace:

```typescript
{/* Card always visible */}
<DraggableEventCard
	event={event}
	isDragging={isDragging}
	isBeingDragged={draggedEventId === event.id}
	previewTime={draggedEventId === event.id ? dragPreviewTime : null}
	isBlocked={draggedEventId === event.id && isDropBlocked}
	onClick={() => onEventClick?.(event)}
	onPin={() => handlePin(event.id)}
	onConfirm={() => handleConfirm(event.id)}
	onUndoDone={() => handleUndoDone(event.id)}
	onDislike={(e) => {
		const card = e.currentTarget.parentElement?.closest("button");
		if (card) handleDislike(event.id, card as HTMLElement);
	}}
	highlighted={
		highlightedEventIds.has(event.id) &&
		!event.pinned &&
		getEventStatus(event) !== "done"
	}
/>
```

**Step 3: Verify it compiles and renders**

Run: `bun dev`
Expected: Timeline renders, cards show drag cursor on long-press

**Step 4: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): integrate DraggableEventCard into timeline"
```

---

## Task 8: Implement Timeline Expansion Mode

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Import position utilities**

```typescript
import { timeToLinearY, PX_PER_HOUR } from "@/lib/timelinePosition";
import { getDayBounds } from "@/lib/timeUtils";
```

**Step 2: Compute linear positions for events during drag**

Add this inside the component, after the flattenedEvents useMemo:

```typescript
// Compute linear positions when dragging
const linearPositions = useMemo(() => {
	if (!isDragging) return null;

	const positions = new Map<string, number>();
	for (const item of flattenedEvents) {
		if (item.type === "event") {
			const { dayStart } = getDayBounds(item.event.startTime);
			const y = timeToLinearY(item.event.startTime, dayStart);
			positions.set(item.event.id, y);
		}
	}
	return positions;
}, [isDragging, flattenedEvents]);
```

**Step 3: Add linear mode class to timeline container**

Find the timeline content div and add conditional class:

```typescript
<div
	className={cn(
		"relative flex flex-col pb-32",
		isDragging && "transition-all duration-300",
	)}
>
```

**Step 4: Apply linear positioning to events during drag**

In the event render section, apply linear position:

```typescript
const linearY = isDragging && linearPositions ? linearPositions.get(event.id) : null;

<div
	key={event.id}
	className={cn(
		"group/slot relative w-full transition-all duration-300",
		shouldDim && "opacity-40 pointer-events-none",
	)}
	style={{
		marginBottom: isDragging ? 0 : `${gapPx}px`,
		...(linearY !== null && {
			position: "absolute",
			top: `${linearY}px`,
			left: 0,
			right: 0,
		}),
	}}
>
```

**Step 5: Verify visual expansion works**

Run: `bun dev`
Expected: On long-press drag start, events shift to linear positions

**Step 6: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): implement timeline expansion to linear mode during drag"
```

---

## Task 9: Implement Drag Move Position Calculation

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Import additional utilities**

```typescript
import { linearYToTime } from "@/lib/timelinePosition";
import { roundToInterval, timesOverlap } from "@/lib/timeUtils";
```

**Step 2: Add ref for timeline container**

```typescript
const timelineRef = useRef<HTMLDivElement>(null);
```

Add ref to the timeline content div:

```typescript
<div ref={timelineRef} className="relative flex flex-col pb-32 ...">
```

**Step 3: Implement handleDragMove**

```typescript
const handleDragMove = useCallback(
	(event: DragMoveEvent) => {
		if (!timelineRef.current || !draggedEventId) return;

		const draggedEvent = events.find((e) => e.id === draggedEventId);
		if (!draggedEvent) return;

		const { dayStart, dayEnd } = getDayBounds(draggedEvent.startTime);
		const rect = timelineRef.current.getBoundingClientRect();

		// Calculate Y position relative to timeline
		const pointerY = (event.activatorEvent as PointerEvent).clientY + (event.delta.y ?? 0);
		const relativeY = pointerY - rect.top;

		// Convert to time and round to 5-minute intervals
		let newTime = linearYToTime(relativeY, dayStart);
		newTime = roundToInterval(newTime, 5);

		// Clamp to day bounds
		newTime = Math.max(dayStart, Math.min(newTime, dayEnd));

		// Calculate event duration
		const duration = (draggedEvent.endTime ?? draggedEvent.startTime) - draggedEvent.startTime;
		const newEndTime = newTime + duration;

		// Check for overlaps with other events
		const hasOverlap = events.some((e) => {
			if (e.id === draggedEventId) return false;
			// Check if events share participants
			const sharedParticipants = e.participants.some((p) =>
				draggedEvent.participants.includes(p),
			);
			if (!sharedParticipants) return false;

			return timesOverlap(newTime, newEndTime, e.startTime, e.endTime ?? e.startTime);
		});

		setDragPreviewTime(newTime);
		setIsDropBlocked(hasOverlap);
	},
	[draggedEventId, events],
);
```

**Step 4: Verify position updates during drag**

Run: `bun dev`
Expected: Card time updates as you drag, red indicator on overlap

**Step 5: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): implement drag move with collision detection"
```

---

## Task 10: Implement Drop Handler

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Implement handleDragEnd**

```typescript
const handleDragEnd = useCallback(
	(event: DragEndEvent) => {
		const eventId = event.active.id as string;

		// If drop is blocked, cancel
		if (!isDropBlocked && dragPreviewTime !== null) {
			setEvents((prev) =>
				prev.map((e) => {
					if (e.id !== eventId) return e;

					const duration = (e.endTime ?? e.startTime) - e.startTime;
					return {
						...e,
						startTime: dragPreviewTime,
						endTime: e.endTime ? dragPreviewTime + duration : null,
					};
				}),
			);
		}

		// Reset drag state
		setIsDragging(false);
		setDraggedEventId(null);
		setDragPreviewTime(null);
		setIsDropBlocked(false);
	},
	[isDropBlocked, dragPreviewTime],
);
```

**Step 2: Test the complete flow**

Run: `bun dev`
Expected:
1. Long-press card -> drag starts, timeline expands
2. Drag up/down -> time preview updates
3. Release on valid spot -> time updates
4. Release on overlap -> card returns to original

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): implement drop handler with time update"
```

---

## Task 11: Show All Hour Ticks During Drag

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Modify flattenedEvents to show all ticks when dragging**

Update the flattenedEvents useMemo to not collapse gaps when `isDragging` is true:

In the section that handles multiple hours (around line 225), change:

```typescript
if (hoursToRender.length === 0) {
	// Same hour, no ticks needed
} else if (hoursToRender.length === 1) {
	addHourTick(hoursToRender[0] as Date);
} else if (isDragging) {
	// During drag, show ALL hour ticks (no collapse)
	for (const hour of hoursToRender) {
		addHourTick(hour);
	}
} else {
	// Normal mode: collapse large gaps
	// ... existing collapse logic
}
```

Add `isDragging` to the useMemo dependency array:

```typescript
}, [eventsByDate, personFilter, isDragging]);
```

**Step 2: Verify all ticks show during drag**

Run: `bun dev`
Expected: When dragging, collapsed gaps expand to show all hour ticks

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): expand all hour ticks during drag mode"
```

---

## Task 12: Add Ghost Indicator at Original Position

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Store original position when drag starts**

Add state:

```typescript
const [dragOriginalTime, setDragOriginalTime] = useState<number | null>(null);
```

Update handleDragStart:

```typescript
const handleDragStart = useCallback((event: DragStartEvent) => {
	const eventId = event.active.id as string;
	const draggedEvent = events.find((e) => e.id === eventId);

	setDraggedEventId(eventId);
	setDragOriginalTime(draggedEvent?.startTime ?? null);
	setIsDragging(true);
}, [events]);
```

Clear in handleDragEnd and handleDragCancel:

```typescript
setDragOriginalTime(null);
```

**Step 2: Render ghost at original position**

After the event card render, add:

```typescript
{/* Ghost at original position during drag */}
{isBeingDragged && dragOriginalTime && (
	<div
		className="absolute left-5 right-0 opacity-30 pointer-events-none"
		style={{
			top: linearPositions ? `${timeToLinearY(dragOriginalTime, getDayBounds(dragOriginalTime).dayStart)}px` : undefined,
		}}
	>
		<div className="h-16 rounded-lg border-2 border-dashed border-stone-600 bg-stone-800/50" />
	</div>
)}
```

**Step 3: Verify ghost appears**

Run: `bun dev`
Expected: Faint dashed outline at original position during drag

**Step 4: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(dnd): add ghost indicator at original position during drag"
```

---

## Task 13: Final Polish and Cleanup

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Run type check and lint**

Run: `bun check`
Expected: No errors

**Step 3: Manual testing checklist**

- [ ] Long-press initiates drag
- [ ] Timeline expands to linear scale
- [ ] Card follows cursor
- [ ] Time preview updates in card
- [ ] Hour ticks all visible during drag
- [ ] Red indicator on overlap
- [ ] Valid drop updates time
- [ ] Invalid drop returns to original
- [ ] Ghost shows at original position
- [ ] Timeline collapses after drop

**Step 4: Commit final polish**

```bash
git add -A
git commit -m "feat(dnd): complete timeline drag-and-drop implementation"
```

---

## Summary

After completing all tasks:
1. Events are draggable with 300ms long-press activation
2. Timeline expands to 60px/hour linear scale during drag
3. Time rounds to 5-minute increments
4. Collision detection prevents overlapping events
5. Visual feedback: ghost at original, time preview, blocked indicator
6. Same-day constraint enforced
