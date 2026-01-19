# Timeline Hour Ticks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hour tick markers and collapsible gaps to the timeline to visualize actual time elapsed between events.

**Architecture:** Extend the `flattenedEvents` array to include `hour-tick` and `collapsed-gap` items inserted between events. Calculate hour boundaries between consecutive events, show up to 2 hour ticks, collapse remaining time into a gap indicator.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## Task 1: Add Hour Formatting Utility

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:1-20`

**Step 1: Add hour formatting helper**

Add this function after the imports (before `UnifiedTimelineProps`):

```typescript
/** Format hour for display: "8 AM", "12 PM", etc. */
function formatHour(date: Date): string {
	const hours = date.getHours();
	const hour12 = hours % 12 || 12;
	const ampm = hours >= 12 ? "PM" : "AM";
	return `${hour12} ${ampm}`;
}
```

**Step 2: Verify it compiles**

Run: `bun check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): add hour formatting utility"
```

---

## Task 2: Extend Timeline Item Types

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:153-158`

**Step 1: Add new item types to the union**

Update the `result` type definition in `flattenedEvents` useMemo:

```typescript
const result: Array<
	| { type: "day-separator"; date: Date; dateStr: string }
	| { type: "now-line" }
	| { type: "event"; event: KitchenEvent }
	| { type: "hour-tick"; hour: Date; label: string }
	| { type: "collapsed-gap"; hours: number; startHour: Date; endHour: Date }
> = [];
```

**Step 2: Verify it compiles**

Run: `bun check`
Expected: No errors (types added but not used yet)

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): extend flattened item types for hour ticks and gaps"
```

---

## Task 3: Create Hour Boundary Calculator

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:20-50` (after formatHour)

**Step 1: Add function to get hour boundaries between two timestamps**

Add after `formatHour`:

```typescript
/**
 * Get hour boundaries between two timestamps.
 * Returns array of Date objects representing each full hour boundary.
 * E.g., 8:30 AM to 11:15 AM returns [9 AM, 10 AM, 11 AM]
 */
function getHourBoundaries(startTime: number, endTime: number): Date[] {
	const boundaries: Date[] = [];

	// Start from the next full hour after startTime
	const start = new Date(startTime);
	const firstHour = new Date(start);
	firstHour.setMinutes(0, 0, 0);
	if (firstHour.getTime() <= startTime) {
		firstHour.setHours(firstHour.getHours() + 1);
	}

	// Collect all hour boundaries before endTime
	let current = firstHour;
	while (current.getTime() < endTime) {
		boundaries.push(new Date(current));
		current = new Date(current);
		current.setHours(current.getHours() + 1);
	}

	return boundaries;
}
```

**Step 2: Verify it compiles**

Run: `bun check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): add hour boundary calculator"
```

---

## Task 4: Insert Hour Ticks and Collapsed Gaps

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:178-193`

**Step 1: Track previous event end time and insert hour items**

Replace the event insertion logic in the `for` loop. Find this section:

```typescript
for (const { event, dateStr } of allSortedEvents) {
	// Insert day separator when date changes
	if (dateStr !== lastDateStr) {
		const date = new Date(`${dateStr}T12:00:00`);
		result.push({ type: "day-separator", date, dateStr });
		lastDateStr = dateStr;
	}

	// Insert now line before first future event (only once)
	if (!nowLineInserted && event.startTime > now) {
		result.push({ type: "now-line" });
		nowLineInserted = true;
	}

	result.push({ type: "event", event });
}
```

Replace with:

```typescript
let lastEventEndTime: number | null = null;

for (const { event, dateStr } of allSortedEvents) {
	// Insert day separator when date changes
	if (dateStr !== lastDateStr) {
		const date = new Date(`${dateStr}T12:00:00`);
		result.push({ type: "day-separator", date, dateStr });
		lastDateStr = dateStr;
		// Reset end time tracking at day boundary
		lastEventEndTime = null;
	}

	// Insert hour ticks/collapsed gaps between events (same day only)
	if (lastEventEndTime !== null) {
		const hourBoundaries = getHourBoundaries(lastEventEndTime, event.startTime);

		if (hourBoundaries.length > 0) {
			if (hourBoundaries.length <= 2) {
				// Show individual hour ticks
				for (const hour of hourBoundaries) {
					result.push({
						type: "hour-tick",
						hour,
						label: formatHour(hour),
					});
				}
			} else {
				// Show first 2 ticks, then collapse the rest
				result.push({
					type: "hour-tick",
					hour: hourBoundaries[0],
					label: formatHour(hourBoundaries[0]),
				});
				result.push({
					type: "hour-tick",
					hour: hourBoundaries[1],
					label: formatHour(hourBoundaries[1]),
				});
				// Collapse remaining hours
				const remainingHours = hourBoundaries.length - 2;
				result.push({
					type: "collapsed-gap",
					hours: remainingHours,
					startHour: hourBoundaries[2],
					endHour: hourBoundaries[hourBoundaries.length - 1],
				});
			}
		}
	}

	// Insert now line before first future event (only once)
	if (!nowLineInserted && event.startTime > now) {
		result.push({ type: "now-line" });
		nowLineInserted = true;
	}

	result.push({ type: "event", event });
	lastEventEndTime = event.endTime ?? event.startTime;
}
```

**Step 2: Verify it compiles**

Run: `bun check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): insert hour ticks and collapsed gaps between events"
```

---

## Task 5: Render Hour Tick Component

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:280-320` (in the render loop)

**Step 1: Add hour-tick rendering case**

Find the `flattenedEvents.map` callback. After the `if (item.type === "now-line")` block and before the event rendering, add:

```typescript
if (item.type === "hour-tick") {
	return (
		<div
			key={`hour-${item.hour.getTime()}`}
			className="relative flex items-center py-2"
			style={{ height: "48px" }}
		>
			{/* Hour label in margin */}
			<div className="absolute right-full pr-2 flex items-center justify-end">
				<span className="text-xs text-stone-600 tabular-nums whitespace-nowrap">
					{item.label}
				</span>
			</div>
			{/* Tick mark crossing timeline */}
			<div className="flex h-px w-3 items-center justify-center">
				<div className="h-px w-3 bg-stone-700" />
			</div>
		</div>
	);
}

if (item.type === "collapsed-gap") {
	return (
		<div
			key={`gap-${item.startHour.getTime()}`}
			className="relative flex items-center justify-center py-1"
			style={{ height: "24px" }}
		>
			{/* Dashed line segment */}
			<div className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-stone-700" />
			{/* Gap label */}
			<span className="ml-4 text-xs text-stone-500">
				{item.hours}h gap
			</span>
		</div>
	);
}
```

**Step 2: Verify it compiles and renders**

Run: `bun dev`
Expected: Hour ticks and collapsed gaps appear between events

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): render hour tick and collapsed gap components"
```

---

## Task 6: Fix Timeline Track for Gaps

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:276-278`

**Step 1: Remove the infinite timeline track**

The current implementation has a single continuous line. We need events and hour ticks to have solid segments, while collapsed gaps have dashed segments.

Find and remove this line:

```typescript
{/* Timeline track - infinite vertical line */}
<div className="absolute left-[calc(2.5rem+5px)] -top-96 bottom-0 w-px bg-gradient-to-b from-transparent via-stone-700 to-transparent" />
```

**Step 2: Add solid line segments to events and hour ticks**

Update the event rendering to include a line segment above it. In the event render block, after the opening `<div>` with `group/slot` class, add:

```typescript
{/* Solid timeline segment */}
<div className="absolute left-0 -top-4 bottom-0 w-px bg-stone-700" style={{ left: "5px" }} />
```

Similarly, update the hour-tick render to include a solid segment:

```typescript
if (item.type === "hour-tick") {
	return (
		<div
			key={`hour-${item.hour.getTime()}`}
			className="relative flex items-center py-2"
			style={{ height: "48px" }}
		>
			{/* Solid timeline segment */}
			<div className="absolute left-0 top-0 bottom-0 w-px bg-stone-700" style={{ left: "5px" }} />
			{/* Hour label in margin */}
			<div className="absolute right-full pr-2 flex items-center justify-end">
				<span className="text-xs text-stone-600 tabular-nums whitespace-nowrap">
					{item.label}
				</span>
			</div>
			{/* Tick mark crossing timeline */}
			<div className="flex h-px w-3 items-center justify-center">
				<div className="h-px w-3 bg-stone-700" />
			</div>
		</div>
	);
}
```

**Step 3: Verify visually**

Run: `bun dev`
Expected: Solid line through events and hour ticks, dashed through collapsed gaps

**Step 4: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): segment timeline track - solid for events, dashed for gaps"
```

---

## Task 7: Update Event Spacing

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:282-312`

**Step 1: Remove time-based gap spacing from events**

The current `getTimeGapSpacing` function calculates logarithmic spacing. With hour ticks handling temporal representation, events should use fixed minimal spacing.

Find the `getTimeGapSpacing` function inside the map callback and replace it:

```typescript
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
```

**Step 2: Verify it compiles and renders**

Run: `bun dev`
Expected: Events have tighter spacing, hour ticks provide the visual gaps

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): simplify event spacing - hour ticks handle temporal gaps"
```

---

## Task 8: Polish and Edge Cases

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Handle now-line interaction with hour ticks**

The now-line should still render at the correct position. Verify it appears correctly between hour ticks. If needed, ensure the now-line insertion happens after hour tick insertion in the loop.

**Step 2: Test edge cases manually**

- Events within same hour: no hour ticks between them ✓
- Events spanning 1-2 hours: individual ticks ✓
- Events spanning 3+ hours: 2 ticks + collapsed gap ✓
- Day boundary: no hour ticks across days ✓

**Step 3: Commit final polish**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat(timeline): polish hour ticks and edge case handling"
```

---

## Summary

After completing all tasks:
1. Hour ticks appear in the left margin between events
2. Gaps >2 hours collapse to "Xh gap" label
3. Timeline track is solid through events/ticks, dashed through gaps
4. Events use tighter fixed spacing since hour ticks handle time visualization
