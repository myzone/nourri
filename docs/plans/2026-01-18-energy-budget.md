# Energy Budget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Apple Health-style energy budget chart showing running balance between food intake and expenditure throughout the day.

**Architecture:** Full-width SVG chart with time on x-axis, energy balance (kcal) on y-axis. Meal/exercise icons positioned along the top. Uncertainty band widens when data is missing. Time range tabs (D/W/M/3M/Y) switch between views.

**Tech Stack:** React, SVG, Zustand, Tailwind, zod for types

---

## Task 1: Define Energy Budget Types

**Files:**
- Modify: `src/types/insights.ts`

**Step 1: Write the types**

```typescript
// src/types/insights.ts
import { z } from "zod";
import { PersonIdSchema } from "./core";

// Time range options
export const TimeRangeSchema = z.enum(["D", "W", "M", "3M", "Y"]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

// Energy event types
export const EnergyEventTypeSchema = z.enum(["meal", "exercise"]);
export type EnergyEventType = z.infer<typeof EnergyEventTypeSchema>;

// A single energy event (meal or exercise)
export const EnergyEventSchema = z.object({
	id: z.string(),
	type: EnergyEventTypeSchema,
	timestamp: z.number(), // unix ms
	kcal: z.number(), // positive for meals, negative for exercise
	label: z.string(), // "Breakfast", "Morning Run", etc.
	details: z.object({
		// For meals
		mealType: z.string().optional(), // breakfast, lunch, dinner, snack
		macros: z.object({
			protein: z.number(),
			carbs: z.number(),
			fat: z.number(),
		}).optional(),
		// For exercise
		activityType: z.string().optional(), // running, cycling, etc.
		duration: z.number().optional(), // minutes
	}).optional(),
	personId: PersonIdSchema,
});
export type EnergyEvent = z.infer<typeof EnergyEventSchema>;

// A point on the energy budget curve
export interface EnergyDataPoint {
	timestamp: number; // unix ms
	balance: number; // cumulative kcal balance
	uncertainty: number; // 0-1, how confident we are (1 = certain, 0 = no data)
}

// Daily energy summary
export interface DailyEnergySummary {
	date: string; // ISO date
	totalIn: number; // kcal from food
	totalOut: number; // kcal burned (BMR + active)
	bmr: number; // passive burn
	active: number; // exercise burn
	netBalance: number; // totalIn - totalOut
	events: EnergyEvent[];
	curve: EnergyDataPoint[];
}
```

**Step 2: Export from index**

Verify `src/types/index.ts` already exports `./insights`.

**Step 3: Commit**

```bash
git add src/types/insights.ts
git commit -m "feat(insights): add energy budget types"
```

---

## Task 2: Create Energy Data Generators

**Files:**
- Create: `src/lib/mockEnergyData.ts`

**Step 1: Write mock data generators**

```typescript
// src/lib/mockEnergyData.ts
import type { EnergyEvent, EnergyDataPoint, DailyEnergySummary } from "@/types";

const MEAL_TIMES = {
	breakfast: { hour: 8, kcal: 450, label: "Breakfast" },
	lunch: { hour: 12, kcal: 650, label: "Lunch" },
	dinner: { hour: 19, kcal: 750, label: "Dinner" },
	snack: { hour: 15, kcal: 200, label: "Snack" },
};

const EXERCISE_TYPES = [
	{ type: "running", kcal: -350, duration: 30, label: "Morning Run" },
	{ type: "cycling", kcal: -280, duration: 45, label: "Bike Ride" },
	{ type: "weights", kcal: -200, duration: 40, label: "Gym Session" },
];

// Generate events for a single day
export function generateDayEvents(date: Date, personId: string): EnergyEvent[] {
	const events: EnergyEvent[] = [];
	const baseTime = new Date(date);
	baseTime.setHours(0, 0, 0, 0);

	// Add meals with some randomness
	for (const [mealType, config] of Object.entries(MEAL_TIMES)) {
		// 90% chance each meal happens
		if (Math.random() > 0.1) {
			const hourOffset = config.hour + (Math.random() - 0.5) * 1.5;
			const timestamp = baseTime.getTime() + hourOffset * 60 * 60 * 1000;
			const kcalVariation = config.kcal * (0.8 + Math.random() * 0.4);

			events.push({
				id: `${date.toISOString().split("T")[0]}-${mealType}`,
				type: "meal",
				timestamp,
				kcal: Math.round(kcalVariation),
				label: config.label,
				details: {
					mealType,
					macros: {
						protein: Math.round(kcalVariation * 0.2 / 4),
						carbs: Math.round(kcalVariation * 0.5 / 4),
						fat: Math.round(kcalVariation * 0.3 / 9),
					},
				},
				personId: personId as any,
			});
		}
	}

	// 40% chance of exercise
	if (Math.random() < 0.4) {
		const exercise = EXERCISE_TYPES[Math.floor(Math.random() * EXERCISE_TYPES.length)];
		const hour = 7 + Math.random() * 12; // between 7am and 7pm
		const timestamp = baseTime.getTime() + hour * 60 * 60 * 1000;

		events.push({
			id: `${date.toISOString().split("T")[0]}-exercise`,
			type: "exercise",
			timestamp,
			kcal: exercise.kcal,
			label: exercise.label,
			details: {
				activityType: exercise.type,
				duration: exercise.duration,
			},
			personId: personId as any,
		});
	}

	return events.sort((a, b) => a.timestamp - b.timestamp);
}

// Calculate energy curve for a day
export function calculateEnergyCurve(
	date: Date,
	events: EnergyEvent[],
	bmr: number = 1800,
): EnergyDataPoint[] {
	const points: EnergyDataPoint[] = [];
	const startOfDay = new Date(date);
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date(date);
	endOfDay.setHours(23, 59, 59, 999);

	// BMR per hour
	const bmrPerHour = bmr / 24;

	// Generate points every 30 minutes
	let balance = 0;
	const intervalMs = 30 * 60 * 1000;

	for (let t = startOfDay.getTime(); t <= endOfDay.getTime(); t += intervalMs) {
		// Apply BMR drain since last point
		if (points.length > 0) {
			balance -= bmrPerHour * 0.5; // 30 min = 0.5 hour
		}

		// Apply any events at or before this time
		for (const event of events) {
			if (event.timestamp <= t && event.timestamp > t - intervalMs) {
				balance += event.kcal;
			}
		}

		// Uncertainty based on how much data we have
		// For now, simulate: higher uncertainty at night, lower during active hours
		const hour = new Date(t).getHours();
		const isActiveHours = hour >= 7 && hour <= 22;
		const uncertainty = isActiveHours ? 0.8 + Math.random() * 0.2 : 0.4 + Math.random() * 0.3;

		points.push({
			timestamp: t,
			balance: Math.round(balance),
			uncertainty,
		});
	}

	return points;
}

// Generate a full day summary
export function generateDailySummary(date: Date, personId: string): DailyEnergySummary {
	const events = generateDayEvents(date, personId);
	const bmr = 1800;
	const curve = calculateEnergyCurve(date, events, bmr);

	const totalIn = events
		.filter((e) => e.type === "meal")
		.reduce((sum, e) => sum + e.kcal, 0);
	const active = Math.abs(
		events
			.filter((e) => e.type === "exercise")
			.reduce((sum, e) => sum + e.kcal, 0),
	);
	const totalOut = bmr + active;

	return {
		date: date.toISOString().split("T")[0],
		totalIn,
		totalOut,
		bmr,
		active,
		netBalance: totalIn - totalOut,
		events,
		curve,
	};
}
```

**Step 2: Commit**

```bash
git add src/lib/mockEnergyData.ts
git commit -m "feat(insights): add energy data generators"
```

---

## Task 3: Build TimeRangeTabs Component

**Files:**
- Create: `src/components/insights/TimeRangeTabs.tsx`

**Step 1: Write the component**

```typescript
// src/components/insights/TimeRangeTabs.tsx
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/types";

const TIME_RANGES: TimeRange[] = ["D", "W", "M", "3M", "Y"];

const LABELS: Record<TimeRange, string> = {
	D: "Day",
	W: "Week",
	M: "Month",
	"3M": "3M",
	Y: "Year",
};

interface TimeRangeTabsProps {
	selected: TimeRange;
	onChange: (range: TimeRange) => void;
}

export function TimeRangeTabs({ selected, onChange }: TimeRangeTabsProps) {
	return (
		<div className="flex items-center gap-1 rounded-lg bg-stone-900 p-1">
			{TIME_RANGES.map((range) => (
				<button
					key={range}
					type="button"
					onClick={() => onChange(range)}
					className={cn(
						"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
						selected === range
							? "bg-stone-700 text-stone-100"
							: "text-stone-500 hover:text-stone-300",
					)}
				>
					{LABELS[range]}
				</button>
			))}
		</div>
	);
}
```

**Step 2: Commit**

```bash
git add src/components/insights/TimeRangeTabs.tsx
git commit -m "feat(insights): add TimeRangeTabs component"
```

---

## Task 4: Build Event Markers Component

**Files:**
- Create: `src/components/insights/EventMarker.tsx`

**Step 1: Write the component**

```typescript
// src/components/insights/EventMarker.tsx
import { useState } from "react";
import type { EnergyEvent } from "@/types";
import { cn } from "@/lib/utils";

interface EventMarkerProps {
	event: EnergyEvent;
	x: number; // x position in pixels
}

export function EventMarker({ event, x }: EventMarkerProps) {
	const [showPopover, setShowPopover] = useState(false);
	const isMeal = event.type === "meal";

	return (
		<div
			className="absolute -translate-x-1/2"
			style={{ left: x }}
		>
			{/* Marker button */}
			<button
				type="button"
				onClick={() => setShowPopover(!showPopover)}
				className={cn(
					"flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110",
					isMeal ? "bg-stone-800" : "bg-emerald-900",
				)}
				aria-label={event.label}
			>
				{isMeal ? (
					<MealIcon className="h-4 w-4 text-stone-300" />
				) : (
					<ExerciseIcon className="h-4 w-4 text-emerald-400" />
				)}
			</button>

			{/* Popover */}
			{showPopover && (
				<div className="absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 rounded-lg bg-stone-800 p-3 shadow-lg min-w-[160px]">
					<div className="text-sm font-medium text-stone-100">{event.label}</div>
					<div className="text-xs text-stone-400">
						{new Date(event.timestamp).toLocaleTimeString([], {
							hour: "numeric",
							minute: "2-digit",
						})}
					</div>
					<div className="mt-1 text-sm font-medium" style={{ color: isMeal ? "#f59e0b" : "#10b981" }}>
						{isMeal ? "+" : ""}{event.kcal} kcal
					</div>
					{event.details?.macros && (
						<div className="mt-2 flex gap-2 text-xs text-stone-500">
							<span>P: {event.details.macros.protein}g</span>
							<span>C: {event.details.macros.carbs}g</span>
							<span>F: {event.details.macros.fat}g</span>
						</div>
					)}
					{event.details?.duration && (
						<div className="mt-1 text-xs text-stone-500">
							{event.details.duration} min
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function MealIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M7 2v20" strokeLinecap="round" />
			<path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function ExerciseIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
```

**Step 2: Commit**

```bash
git add src/components/insights/EventMarker.tsx
git commit -m "feat(insights): add EventMarker with popover"
```

---

## Task 5: Build Energy Budget Chart (Core)

**Files:**
- Create: `src/components/insights/EnergyBudgetChart.tsx`

**Step 1: Write the chart component**

```typescript
// src/components/insights/EnergyBudgetChart.tsx
import { useMemo } from "react";
import type { EnergyDataPoint, EnergyEvent } from "@/types";
import { EventMarker } from "./EventMarker";

interface EnergyBudgetChartProps {
	curve: EnergyDataPoint[];
	events: EnergyEvent[];
	width?: number;
	height?: number;
}

const PADDING = { top: 50, right: 20, bottom: 40, left: 50 };

export function EnergyBudgetChart({
	curve,
	events,
	width = 800,
	height = 400,
}: EnergyBudgetChartProps) {
	const chartWidth = width - PADDING.left - PADDING.right;
	const chartHeight = height - PADDING.top - PADDING.bottom;

	// Calculate scales
	const { xScale, yScale, yMin, yMax } = useMemo(() => {
		if (curve.length === 0) {
			return {
				xScale: (_t: number) => 0,
				yScale: (_v: number) => chartHeight / 2,
				yMin: -500,
				yMax: 500,
			};
		}

		const timeMin = curve[0].timestamp;
		const timeMax = curve[curve.length - 1].timestamp;
		const values = curve.map((p) => p.balance);
		const minVal = Math.min(...values, 0);
		const maxVal = Math.max(...values, 0);
		const padding = Math.max(Math.abs(maxVal - minVal) * 0.1, 200);
		const yMin = minVal - padding;
		const yMax = maxVal + padding;

		return {
			xScale: (t: number) => ((t - timeMin) / (timeMax - timeMin)) * chartWidth,
			yScale: (v: number) => chartHeight - ((v - yMin) / (yMax - yMin)) * chartHeight,
			yMin,
			yMax,
		};
	}, [curve, chartWidth, chartHeight]);

	// Build SVG path for the curve
	const linePath = useMemo(() => {
		if (curve.length === 0) return "";
		return curve
			.map((p, i) => {
				const x = xScale(p.timestamp);
				const y = yScale(p.balance);
				return `${i === 0 ? "M" : "L"} ${x} ${y}`;
			})
			.join(" ");
	}, [curve, xScale, yScale]);

	// Build uncertainty band path
	const bandPath = useMemo(() => {
		if (curve.length === 0) return "";
		const maxUncertainty = 150; // max kcal spread for uncertainty band

		const upperPoints = curve.map((p) => {
			const x = xScale(p.timestamp);
			const spread = (1 - p.uncertainty) * maxUncertainty;
			const y = yScale(p.balance + spread);
			return `${x},${y}`;
		});

		const lowerPoints = curve
			.slice()
			.reverse()
			.map((p) => {
				const x = xScale(p.timestamp);
				const spread = (1 - p.uncertainty) * maxUncertainty;
				const y = yScale(p.balance - spread);
				return `${x},${y}`;
			});

		return `M ${upperPoints.join(" L ")} L ${lowerPoints.join(" L ")} Z`;
	}, [curve, xScale, yScale]);

	// Time axis labels
	const timeLabels = useMemo(() => {
		const labels: { x: number; label: string }[] = [];
		if (curve.length === 0) return labels;

		const startDate = new Date(curve[0].timestamp);
		startDate.setMinutes(0, 0, 0);

		for (let hour = 0; hour <= 24; hour += 4) {
			const d = new Date(startDate);
			d.setHours(hour);
			labels.push({
				x: xScale(d.getTime()),
				label: hour === 0 ? "12am" : hour === 12 ? "12pm" : hour > 12 ? `${hour - 12}pm` : `${hour}am`,
			});
		}
		return labels;
	}, [curve, xScale]);

	// Y-axis labels
	const yLabels = useMemo(() => {
		const labels: { y: number; label: string }[] = [];
		const step = 500;
		const start = Math.floor(yMin / step) * step;
		const end = Math.ceil(yMax / step) * step;

		for (let v = start; v <= end; v += step) {
			labels.push({
				y: yScale(v),
				label: v >= 0 ? `+${v}` : `${v}`,
			});
		}
		return labels;
	}, [yMin, yMax, yScale]);

	// Zero line y position
	const zeroY = yScale(0);

	return (
		<div className="relative">
			{/* Event markers row */}
			<div className="relative h-10 mb-2" style={{ marginLeft: PADDING.left, width: chartWidth }}>
				{events.map((event) => (
					<EventMarker key={event.id} event={event} x={xScale(event.timestamp)} />
				))}
			</div>

			{/* SVG Chart */}
			<svg width={width} height={height} className="overflow-visible">
				<g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
					{/* Zero line */}
					<line
						x1={0}
						x2={chartWidth}
						y1={zeroY}
						y2={zeroY}
						stroke="#525252"
						strokeDasharray="4 4"
					/>

					{/* Y-axis labels */}
					{yLabels.map(({ y, label }) => (
						<text
							key={label}
							x={-10}
							y={y}
							textAnchor="end"
							dominantBaseline="middle"
							className="fill-stone-500 text-xs"
						>
							{label}
						</text>
					))}

					{/* Uncertainty band */}
					<path d={bandPath} fill="#78716c" fillOpacity={0.2} />

					{/* Main curve */}
					<path d={linePath} fill="none" stroke="#a8a29e" strokeWidth={2} />

					{/* X-axis labels */}
					{timeLabels.map(({ x, label }) => (
						<text
							key={label}
							x={x}
							y={chartHeight + 20}
							textAnchor="middle"
							className="fill-stone-500 text-xs"
						>
							{label}
						</text>
					))}
				</g>
			</svg>
		</div>
	);
}
```

**Step 2: Commit**

```bash
git add src/components/insights/EnergyBudgetChart.tsx
git commit -m "feat(insights): add EnergyBudgetChart component"
```

---

## Task 6: Wire Up InsightsPage

**Files:**
- Modify: `src/components/insights/InsightsPage.tsx`

**Step 1: Update InsightsPage**

```typescript
// src/components/insights/InsightsPage.tsx
import { useState, useMemo } from "react";
import type { TimeRange } from "@/types";
import { TimeRangeTabs } from "./TimeRangeTabs";
import { EnergyBudgetChart } from "./EnergyBudgetChart";
import { generateDailySummary } from "@/lib/mockEnergyData";
import { usePersonFilterStore } from "@/stores/personFilter";

export function InsightsPage() {
	const [timeRange, setTimeRange] = useState<TimeRange>("D");
	const personFilter = usePersonFilterStore((s) => s.filter);

	// Generate data for today
	const summary = useMemo(() => {
		const personId = personFilter === "all" ? "person-1" : personFilter;
		return generateDailySummary(new Date(), personId);
	}, [personFilter]);

	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-xl font-semibold text-stone-100">Energy Budget</h1>
					<TimeRangeTabs selected={timeRange} onChange={setTimeRange} />
				</div>

				{/* Summary stats */}
				<div className="flex gap-6 mb-6 text-sm">
					<div>
						<div className="text-stone-500">In</div>
						<div className="text-lg font-medium text-amber-400">+{summary.totalIn} kcal</div>
					</div>
					<div>
						<div className="text-stone-500">Out</div>
						<div className="text-lg font-medium text-stone-400">-{summary.totalOut} kcal</div>
					</div>
					<div>
						<div className="text-stone-500">Net</div>
						<div className={`text-lg font-medium ${summary.netBalance >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
							{summary.netBalance >= 0 ? "+" : ""}{summary.netBalance} kcal
						</div>
					</div>
				</div>

				{/* Chart */}
				<div className="rounded-xl bg-stone-900 p-4">
					<EnergyBudgetChart
						curve={summary.curve}
						events={summary.events}
						width={900}
						height={400}
					/>
				</div>

				{/* Placeholder for other time ranges */}
				{timeRange !== "D" && (
					<div className="mt-4 text-center text-stone-500">
						{timeRange} view coming soon
					</div>
				)}
			</div>
		</div>
	);
}
```

**Step 2: Commit**

```bash
git add src/components/insights/InsightsPage.tsx
git commit -m "feat(insights): wire up InsightsPage with energy budget chart"
```

---

## Task 7: Make Chart Responsive

**Files:**
- Modify: `src/components/insights/EnergyBudgetChart.tsx`
- Modify: `src/components/insights/InsightsPage.tsx`

**Step 1: Add resize hook to chart**

Create a useResizeObserver hook or use a container ref:

```typescript
// Add to EnergyBudgetChart.tsx
import { useRef, useState, useEffect } from "react";

// At start of component:
const containerRef = useRef<HTMLDivElement>(null);
const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

useEffect(() => {
	const container = containerRef.current;
	if (!container) return;

	const observer = new ResizeObserver((entries) => {
		const { width } = entries[0].contentRect;
		setDimensions({ width, height: Math.min(400, width * 0.5) });
	});

	observer.observe(container);
	return () => observer.disconnect();
}, []);

// Wrap return in:
return (
	<div ref={containerRef} className="w-full">
		{/* existing content, use dimensions.width and dimensions.height */}
	</div>
);
```

**Step 2: Update InsightsPage to not pass fixed width**

Remove width/height props, let chart be responsive.

**Step 3: Commit**

```bash
git add src/components/insights/EnergyBudgetChart.tsx src/components/insights/InsightsPage.tsx
git commit -m "feat(insights): make energy budget chart responsive"
```

---

## Task 8: Add Color Zones to Chart

**Files:**
- Modify: `src/components/insights/EnergyBudgetChart.tsx`

**Step 1: Add surplus/deficit color zones**

Add colored background bands for positive (surplus) and negative (deficit) zones:

```typescript
// Before the uncertainty band in the SVG:
{/* Deficit zone (below zero) - subtle green */}
<rect
	x={0}
	y={zeroY}
	width={chartWidth}
	height={chartHeight - zeroY}
	fill="#10b981"
	fillOpacity={0.05}
/>

{/* Surplus zone (above zero) - subtle amber */}
<rect
	x={0}
	y={0}
	width={chartWidth}
	height={zeroY}
	fill="#f59e0b"
	fillOpacity={0.05}
/>
```

**Step 2: Color the line based on value**

Use gradient or segmented paths to color the line green when below zero, amber when above.

**Step 3: Commit**

```bash
git add src/components/insights/EnergyBudgetChart.tsx
git commit -m "feat(insights): add color zones to energy budget chart"
```

---

## Task 9: Test and Polish

**Step 1: Run dev server**

```bash
bun dev
```

**Step 2: Test interactions**
- Click event markers to see popovers
- Switch time range tabs
- Switch person filter in header

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(insights): polish energy budget chart"
```

---

## Summary

After completing all tasks, the Insights page will have:
1. Energy budget types defined in `src/types/insights.ts`
2. Mock data generators in `src/lib/mockEnergyData.ts`
3. TimeRangeTabs component for D/W/M/3M/Y selection
4. EventMarker component with interactive popovers
5. EnergyBudgetChart SVG component with:
   - Running balance curve
   - Uncertainty band
   - Surplus/deficit color zones
   - Time axis (24hr)
   - Value axis (kcal)
6. Responsive layout that works on tablet, mobile, and mac
