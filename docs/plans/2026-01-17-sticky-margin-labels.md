# Sticky Margin Labels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move day/time labels to a sticky left margin column while keeping timeline dots and cards unchanged.

**Architecture:** Add a two-column flex layout to UnifiedTimeline - a narrow left margin for sticky labels and the existing timeline content on the right. Labels use CSS `position: sticky` with stacking offsets.

**Tech Stack:** React, Tailwind CSS, existing UnifiedTimeline patterns

---

### Task 1: Add Margin Column Layout

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:304-310`

**Step 1: Update container structure**

Change the timeline content container from single-column to two-column flex layout.

Find this code (~line 304):
```tsx
{/* Timeline content */}
<div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6">
	{/* Single continuous timeline */}
	<div className="relative flex flex-col pb-32">
		{/* Timeline track - infinite vertical line */}
		<div className="absolute left-[5px] -top-96 bottom-0 w-px bg-gradient-to-b from-transparent via-stone-700 to-transparent" />
```

Replace with:
```tsx
{/* Timeline content */}
<div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6">
	{/* Two-column layout: margin + timeline */}
	<div className="relative flex">
		{/* Left margin column for sticky labels */}
		<div className="relative w-16 shrink-0" />

		{/* Timeline column */}
		<div className="relative flex flex-1 flex-col pb-32">
			{/* Timeline track - infinite vertical line */}
			<div className="absolute left-[5px] -top-96 bottom-0 w-px bg-gradient-to-b from-transparent via-stone-700 to-transparent" />
```

**Step 2: Close the new wrapper div**

Find the closing divs near line 493-497:
```tsx
				</div>

				{/* Bottom fade overlay */}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950 to-transparent" />
			</div>
```

Replace with (add one more closing div):
```tsx
				</div>
			</div>
		</div>

		{/* Bottom fade overlay */}
		<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950 to-transparent" />
	</div>
```

**Step 3: Verify visually**

Run: `bun dev`
Check: Timeline should look the same, just with extra left margin space

**Step 4: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "refactor: add two-column layout for margin labels"
```

---

### Task 2: Extract Day Labels to Margin

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:344-379` (day separator rendering)

**Step 1: Create margin label component inline**

Find the day separator rendering (~line 344-379):
```tsx
if (item.type === "day-separator") {
	const today = isToday(item.date);
	const tomorrow = isTomorrow(item.date);

	return (
		<div
			key={`day-${item.dateStr}`}
			className="relative flex w-full items-center gap-3 pl-5 pt-4 pb-2"
		>
			{/* Day dot on timeline */}
			<div className="absolute left-0 flex h-2.5 w-2.5 items-center justify-center">
				<div
					className={cn(
						"h-2.5 w-2.5 rounded-full",
						today ? "bg-sage-500" : "bg-stone-600",
					)}
				/>
			</div>
			{/* Day label */}
			<span
				className={cn(
					"font-semibold tracking-tight",
					today
						? "text-base text-stone-100"
						: tomorrow
							? "text-sm text-stone-200"
							: "text-sm text-stone-400",
				)}
			>
				{today ? "Today" : tomorrow ? "Tomorrow" : getDayName(item.date)}
			</span>
			<span className="text-xs text-stone-600">{getMonthDay(item.date)}</span>
			{/* Separator line */}
			<div className="h-px flex-1 bg-gradient-to-r from-stone-700 to-transparent" />
		</div>
	);
}
```

Replace with:
```tsx
if (item.type === "day-separator") {
	const today = isToday(item.date);
	const tomorrow = isTomorrow(item.date);
	const dayLabel = today ? "Today" : tomorrow ? "Tomorrow" : getDayName(item.date);

	return (
		<div
			key={`day-${item.dateStr}`}
			className="relative flex w-full items-center pt-4 pb-2"
		>
			{/* Margin label - positioned in left margin */}
			<div className="absolute right-full mr-3 flex flex-col items-end">
				<button
					type="button"
					onClick={() => {
						// Scroll to this day section
						const element = document.getElementById(`day-${item.dateStr}`);
						element?.scrollIntoView({ behavior: "smooth", block: "start" });
					}}
					className={cn(
						"font-semibold tracking-tight text-right whitespace-nowrap",
						today
							? "text-sm text-stone-100"
							: tomorrow
								? "text-xs text-stone-300"
								: "text-xs text-stone-500",
					)}
				>
					{dayLabel}
				</button>
				<span className="text-[10px] text-stone-600">{getMonthDay(item.date)}</span>
			</div>

			{/* Day dot on timeline */}
			<div
				id={`day-${item.dateStr}`}
				className="absolute left-0 flex h-2.5 w-2.5 items-center justify-center"
			>
				<div
					className={cn(
						"h-2.5 w-2.5 rounded-full",
						today ? "bg-sage-500" : "bg-stone-600",
					)}
				/>
			</div>

			{/* Separator line - extends from dot to edge */}
			<div className="ml-5 h-px flex-1 bg-gradient-to-r from-stone-700 to-transparent" />
		</div>
	);
}
```

**Step 2: Verify visually**

Run: `bun dev`
Check: Day labels now appear in left margin, dots and lines unchanged

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat: move day labels to left margin"
```

---

### Task 3: Extract Time Label to Margin

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx:19-48` (NowLine component)

**Step 1: Update NowLine component**

Find the NowLine component (~line 19-48):
```tsx
function NowLine() {
	const [time, setTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setTime(new Date()), 60000);
		return () => clearInterval(interval);
	}, []);

	const timeStr = time.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

	return (
		<div className="relative flex w-full items-center py-2 pl-5">
			{/* Pulsing dot aligned with timeline */}
			<div className="absolute left-0 flex h-3 w-3 items-center justify-center">
				<div className="absolute h-3 w-3 animate-ping rounded-full bg-terra-500/40" />
				<div className="h-2.5 w-2.5 rounded-full bg-terra-500 shadow-[0_0_8px_rgba(201,118,83,0.5)]" />
			</div>
			{/* Line extends to edge */}
			<div className="h-px flex-1 bg-gradient-to-r from-terra-500 to-transparent" />
			{/* Time label */}
			<span className="ml-3 font-medium tabular-nums text-terra-400 text-xs tracking-wide">
				{timeStr}
			</span>
		</div>
	);
}
```

Replace with:
```tsx
function NowLine() {
	const [time, setTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setTime(new Date()), 60000);
		return () => clearInterval(interval);
	}, []);

	const timeStr = time.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

	return (
		<div id="now-line" className="relative flex w-full items-center py-2">
			{/* Margin label - positioned in left margin */}
			<div className="absolute right-full mr-3 flex items-center">
				<button
					type="button"
					onClick={() => {
						const element = document.getElementById("now-line");
						element?.scrollIntoView({ behavior: "smooth", block: "center" });
					}}
					className="font-medium tabular-nums text-terra-400 text-xs tracking-wide whitespace-nowrap"
				>
					{timeStr}
				</button>
			</div>

			{/* Pulsing dot aligned with timeline */}
			<div className="absolute left-0 flex h-3 w-3 items-center justify-center">
				<div className="absolute h-3 w-3 animate-ping rounded-full bg-terra-500/40" />
				<div className="h-2.5 w-2.5 rounded-full bg-terra-500 shadow-[0_0_8px_rgba(201,118,83,0.5)]" />
			</div>

			{/* Line extends to edge */}
			<div className="ml-5 h-px flex-1 bg-gradient-to-r from-terra-500 to-transparent" />
		</div>
	);
}
```

**Step 2: Verify visually**

Run: `bun dev`
Check: Time label now appears in left margin next to day labels, pulsing dot and gradient line unchanged

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat: move time label to left margin"
```

---

### Task 4: Add Sticky Behavior to Labels

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx` (day separator and NowLine)

**Step 1: Make day label sticky**

In the day separator block, update the margin label div:

Find:
```tsx
{/* Margin label - positioned in left margin */}
<div className="absolute right-full mr-3 flex flex-col items-end">
```

Replace with:
```tsx
{/* Margin label - sticky in left margin */}
<div className="absolute right-full mr-3 flex flex-col items-end sticky top-16 z-10">
```

**Step 2: Make time label sticky with offset**

In the NowLine component, update the margin label div:

Find:
```tsx
{/* Margin label - positioned in left margin */}
<div className="absolute right-full mr-3 flex items-center">
```

Replace with:
```tsx
{/* Margin label - sticky in left margin, below day label */}
<div className="absolute right-full mr-3 flex items-center sticky top-24 z-10">
```

**Step 3: Verify sticky behavior**

Run: `bun dev`
Check:
- Scroll the timeline
- Day labels should stick near top as you scroll past
- Time label should stick below day label
- Labels should push each other as new sections scroll in

**Step 4: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat: add sticky behavior to margin labels"
```

---

### Task 5: Fine-tune Positioning and Polish

**Files:**
- Modify: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Adjust sticky positioning if needed**

Test on iPad viewport (1024x768 or similar). Adjust:
- `top-16` / `top-24` values if header height differs
- `mr-3` margin spacing if labels overlap
- `w-16` margin column width if labels get truncated

**Step 2: Verify no visual regressions**

Run: `bun dev`
Check:
- Event cards unchanged in appearance
- Timeline dots unchanged
- Decorative lines render correctly
- Person filter still works
- Carousel overlay still works

**Step 3: Run type check and lint**

Run: `bun check`
Expected: No errors

**Step 4: Final commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "polish: fine-tune sticky margin label positioning"
```

---

## Summary

5 tasks total:
1. Add margin column layout structure
2. Move day labels to margin
3. Move time label to margin
4. Add sticky behavior
5. Polish and verify
