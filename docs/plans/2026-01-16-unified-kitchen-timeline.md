# Unified Kitchen Timeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a UI prototype of the unified kitchen timeline showing all kitchen events (cooking, eating, defrost, grocery, dishwasher) in a single chronological stream with detailed meal descriptions.

**Architecture:** Replace the current meal-slot-only timeline with a unified event stream. Create mock data for a 3-day scenario (Sunday-Tuesday) with variety of events. Build distinct card components for primary events (cooking/eating) and secondary events (kitchen tasks). Keep existing data model unchanged - this is a visual prototype only.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing design tokens (stone palette, sage/terra accents, DM Sans)

---

## Task 1: Create Kitchen Event Types (Mock Only)

**Files:**
- Create: `src/lib/mockKitchenEvents.ts`

**Step 1: Define mock event type structure**

Create the mock data file with TypeScript interfaces for kitchen events:

```typescript
// src/lib/mockKitchenEvents.ts
import type { PersonId } from "@/types";

// Event types for the unified timeline
export type KitchenEventType =
  | "cooking"
  | "eating"
  | "defrost"
  | "grocery"
  | "dishwasher"
  | "cleanup";

export type EventStatus =
  | "upcoming"
  | "soon"      // within 30min
  | "active"    // in progress
  | "done"
  | "overdue";

export interface KitchenEvent {
  id: string;
  type: KitchenEventType;
  date: string;              // ISO date "YYYY-MM-DD"
  startTime: number;         // timestamp
  endTime: number | null;    // null for point-in-time events
  title: string;             // e.g., "Herb-crusted baked salmon"
  description: string | null; // full meal description with details
  participants: PersonId[];  // who's involved
  status: EventStatus;

  // Type-specific fields
  cookingOutput?: {          // for cooking events
    portions: number;
    storageDays: number;
    storageLocation: "fridge" | "freezer";
  };
  inventorySource?: {        // for eating events
    description: string;     // e.g., "from Sunday batch"
  };
  durationMins?: number;     // for events with duration
}

// Helper to get status based on time
export function getEventStatus(event: KitchenEvent): EventStatus {
  if (event.status === "done") return "done";

  const now = Date.now();
  const startTime = event.startTime;
  const endTime = event.endTime ?? startTime;

  // Currently happening
  if (now >= startTime && now <= endTime) return "active";

  // Should have started but hasn't
  if (now > startTime && event.status !== "done") return "overdue";

  // Within 30 minutes
  const minsUntil = (startTime - now) / 60000;
  if (minsUntil > 0 && minsUntil <= 30) return "soon";

  return "upcoming";
}
```

**Step 2: Verify TypeScript compiles**

Run: `bun run build`
Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add src/lib/mockKitchenEvents.ts
git commit -m "feat: add kitchen event types for unified timeline prototype"
```

---

## Task 2: Generate Mock Kitchen Events Data

**Files:**
- Modify: `src/lib/mockKitchenEvents.ts`

**Step 1: Add mock data generation function**

Add the following to `mockKitchenEvents.ts`:

```typescript
import { formatDate } from "./date";

const PERSON_ALEX = "person_alex001" as PersonId;
const PERSON_SAM = "person_sam002" as PersonId;

function createEvent(
  date: Date,
  hour: number,
  minute: number,
  type: KitchenEventType,
  title: string,
  options: Partial<Omit<KitchenEvent, "id" | "type" | "date" | "startTime" | "title">> = {}
): KitchenEvent {
  const startTime = new Date(date);
  startTime.setHours(hour, minute, 0, 0);

  const endTime = options.durationMins
    ? startTime.getTime() + options.durationMins * 60000
    : null;

  return {
    id: `event_${Math.random().toString(36).slice(2, 10)}`,
    type,
    date: formatDate(date),
    startTime: startTime.getTime(),
    endTime,
    title,
    description: options.description ?? null,
    participants: options.participants ?? [PERSON_ALEX],
    status: options.status ?? "upcoming",
    cookingOutput: options.cookingOutput,
    inventorySource: options.inventorySource,
    durationMins: options.durationMins,
  };
}

export function generateMockKitchenEvents(): KitchenEvent[] {
  const events: KitchenEvent[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // ===== SUNDAY (today - assume it's Sunday for the prototype) =====
  const sunday = new Date(now);

  // Brunch
  events.push(createEvent(sunday, 10, 0, "eating", "Brunch", {
    description: "Sourdough avocado toast with two poached eggs, cherry tomatoes, microgreens, everything seasoning. Side of Greek yogurt with honey and walnuts.",
    participants: [PERSON_ALEX, PERSON_SAM],
    durationMins: 45,
    status: "done",
  }));

  // Prep dinner
  events.push(createEvent(sunday, 17, 0, "cooking", "Prep dinner", {
    description: "Herb-crusted baked salmon with roasted asparagus, quinoa pilaf",
    participants: [PERSON_ALEX],
    durationMins: 30,
    status: "done",
  }));

  // Dinner
  events.push(createEvent(sunday, 18, 0, "eating", "Dinner", {
    description: "Herb-crusted baked salmon (200g portion), roasted asparagus with olive oil and garlic, quinoa pilaf with lemon zest and fresh dill. Side salad with mixed greens.",
    participants: [PERSON_ALEX, PERSON_SAM],
    durationMins: 45,
    status: "done",
  }));

  // Dishwasher
  events.push(createEvent(sunday, 19, 0, "dishwasher", "Run dishwasher", {
    participants: [PERSON_SAM],
    status: "done",
  }));

  // ===== MONDAY (tomorrow) =====
  const monday = new Date(now);
  monday.setDate(now.getDate() + 1);

  // Breakfast
  events.push(createEvent(monday, 7, 30, "eating", "Breakfast", {
    description: "Overnight oats with almond milk, chia seeds, sliced banana, blueberries, drizzle of maple syrup. Black coffee.",
    participants: [PERSON_ALEX],
    durationMins: 20,
  }));

  // Lunch
  events.push(createEvent(monday, 12, 30, "eating", "Lunch", {
    description: "Mediterranean bowl - chickpeas, cucumber, cherry tomatoes, red onion, feta, over mixed greens with olive oil lemon dressing. Whole grain pita on side.",
    participants: [PERSON_ALEX],
    durationMins: 30,
  }));

  // Defrost chicken
  events.push(createEvent(monday, 14, 0, "defrost", "Move chicken to fridge", {
    description: "Take chicken breast from freezer to fridge to defrost for dinner",
    participants: [PERSON_ALEX],
  }));

  // Cook dinner
  events.push(createEvent(monday, 17, 30, "cooking", "Cook chicken and veg", {
    description: "Grilled lemon herb chicken breast, sautéed spinach with garlic, roasted sweet potato wedges",
    participants: [PERSON_ALEX],
    durationMins: 25,
  }));

  // Dinner
  events.push(createEvent(monday, 18, 15, "eating", "Dinner", {
    description: "Grilled lemon herb chicken breast (180g), sautéed spinach with garlic, roasted sweet potato wedges. Glass of water with lemon.",
    participants: [PERSON_ALEX, PERSON_SAM],
    durationMins: 40,
  }));

  // Cleanup
  events.push(createEvent(monday, 19, 0, "cleanup", "Kitchen cleanup", {
    description: "Clear table, wipe counters, load dishwasher",
    participants: [PERSON_SAM],
    durationMins: 15,
  }));

  // ===== TUESDAY =====
  const tuesday = new Date(now);
  tuesday.setDate(now.getDate() + 2);

  // Breakfast
  events.push(createEvent(tuesday, 7, 30, "eating", "Breakfast", {
    description: "Açaí smoothie bowl - açaí, frozen berries, banana blended thick. Topped with granola, coconut flakes, almond butter, fresh strawberries.",
    participants: [PERSON_ALEX],
    durationMins: 20,
  }));

  // Grocery delivery
  events.push(createEvent(tuesday, 10, 0, "grocery", "Grocery delivery", {
    description: "Weekly grocery delivery - fresh produce, proteins, pantry items",
    participants: [PERSON_ALEX],
    durationMins: 60, // delivery window
  }));

  // Lunch
  events.push(createEvent(tuesday, 12, 30, "eating", "Lunch", {
    description: "Whole wheat wrap with sliced turkey, avocado, mixed greens, shredded carrots, hummus spread. Apple on side.",
    participants: [PERSON_ALEX],
    durationMins: 25,
  }));

  // Cook stir-fry
  events.push(createEvent(tuesday, 18, 0, "cooking", "Cook stir-fry", {
    description: "Ginger garlic shrimp stir-fry with snap peas, red bell pepper, broccoli over brown rice",
    participants: [PERSON_SAM],
    durationMins: 15,
  }));

  // Dinner
  events.push(createEvent(tuesday, 18, 30, "eating", "Dinner", {
    description: "Ginger garlic shrimp stir-fry with snap peas, red bell pepper, broccoli over brown rice. Garnish with sesame seeds and green onion.",
    participants: [PERSON_ALEX, PERSON_SAM],
    durationMins: 40,
  }));

  // Dishwasher
  events.push(createEvent(tuesday, 19, 30, "dishwasher", "Run dishwasher", {
    participants: [PERSON_ALEX],
  }));

  return events;
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/mockKitchenEvents.ts
git commit -m "feat: add mock kitchen events data for 3-day scenario"
```

---

## Task 3: Create Event Card Components

**Files:**
- Create: `src/components/calendar/KitchenEventCard.tsx`

**Step 1: Create the primary event card component**

```typescript
// src/components/calendar/KitchenEventCard.tsx
import { cn } from "@/lib/utils";
import type { KitchenEvent } from "@/lib/mockKitchenEvents";
import { getEventStatus } from "@/lib/mockKitchenEvents";

interface KitchenEventCardProps {
  event: KitchenEvent;
  onClick?: () => void;
}

const EVENT_ICONS: Record<string, string> = {
  cooking: "🍳",
  eating: "🍽️",
  defrost: "🧊",
  grocery: "📦",
  dishwasher: "🍽️",
  cleanup: "🧹",
};

function formatEventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const diffMins = Math.round(diff / 60000);

  if (diffMins < 0) {
    const pastMins = Math.abs(diffMins);
    if (pastMins < 60) return `${pastMins} min ago`;
    if (pastMins < 120) return "1 hour ago";
    return formatEventTime(timestamp);
  }
  if (diffMins < 60) return `in ${diffMins} min`;
  if (diffMins < 120) return "in 1 hour";
  if (diffMins < 180) return "in 2 hours";
  return formatEventTime(timestamp);
}

export function KitchenEventCard({ event, onClick }: KitchenEventCardProps) {
  const status = getEventStatus(event);
  const isPrimary = event.type === "cooking" || event.type === "eating";
  const icon = EVENT_ICONS[event.type] ?? "📋";

  // Time display
  const timeDisplay = status === "done"
    ? formatEventTime(event.startTime)
    : getRelativeTime(event.startTime);

  // Duration display
  const durationDisplay = event.durationMins
    ? `${event.durationMins} min`
    : null;

  // Progress for active events
  const progress = status === "active" && event.endTime
    ? Math.min(100, ((Date.now() - event.startTime) / (event.endTime - event.startTime)) * 100)
    : null;

  if (!isPrimary) {
    // Secondary card (compact)
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
          status === "done"
            ? "border-stone-800/50 bg-stone-900/30 text-stone-500"
            : status === "overdue"
              ? "border-terra-500/30 bg-terra-500/5 text-terra-400"
              : "border-stone-800 bg-stone-900/50 text-stone-400 hover:border-stone-700",
        )}
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-sm">{event.title}</span>
        <span className="text-xs text-stone-500">
          {status === "done" ? "✓" : timeDisplay}
        </span>
      </button>
    );
  }

  // Primary card (full)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-left transition-all",
        status === "done"
          ? "border-stone-800/50 bg-stone-900/30"
          : status === "active"
            ? "border-sage-500/50 bg-sage-500/5"
            : status === "overdue"
              ? "border-terra-500/50 bg-terra-500/5"
              : status === "soon"
                ? "border-stone-700 bg-stone-900"
                : "border-stone-800 bg-stone-900 hover:border-stone-700",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3
            className={cn(
              "font-medium",
              status === "done" ? "text-stone-400" : "text-stone-100",
            )}
          >
            {event.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {status === "done" && (
            <span className="text-xs text-sage-500">✓ Done</span>
          )}
          {status === "active" && (
            <span className="rounded-full bg-sage-500/20 px-2 py-0.5 text-xs text-sage-400">
              In progress
            </span>
          )}
          {status === "overdue" && (
            <span className="rounded-full bg-terra-500/20 px-2 py-0.5 text-xs text-terra-400">
              Overdue
            </span>
          )}
          {status === "soon" && (
            <span className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-300">
              Soon
            </span>
          )}
        </div>
      </div>

      {/* Time and duration */}
      <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
        <span>{timeDisplay}</span>
        {durationDisplay && (
          <>
            <span>·</span>
            <span>{durationDisplay}</span>
          </>
        )}
        {event.participants.length > 0 && (
          <>
            <span>·</span>
            <span>
              {event.participants.map((p) => p.charAt(7).toUpperCase()).join(", ")}
            </span>
          </>
        )}
      </div>

      {/* Progress bar for active events */}
      {progress !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full bg-sage-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Description */}
      {event.description && (
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            status === "done" ? "text-stone-500" : "text-stone-400",
          )}
        >
          {event.description}
        </p>
      )}

      {/* Cooking output */}
      {event.cookingOutput && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-sage-400">
          <span>→</span>
          <span>
            Produces: {event.cookingOutput.portions} portions (
            {event.cookingOutput.storageLocation} {event.cookingOutput.storageDays} days)
          </span>
        </div>
      )}

      {/* Inventory source */}
      {event.inventorySource && (
        <div className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
          <span>←</span>
          <span>Using: {event.inventorySource.description}</span>
        </div>
      )}
    </button>
  );
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/calendar/KitchenEventCard.tsx
git commit -m "feat: add KitchenEventCard component for unified timeline"
```

---

## Task 4: Create Unified Timeline Component

**Files:**
- Create: `src/components/calendar/UnifiedTimeline.tsx`

**Step 1: Create the unified timeline component**

```typescript
// src/components/calendar/UnifiedTimeline.tsx
import { useMemo, useState } from "react";
import { formatDate, getDayName, getMonthDay, isToday, isTomorrow } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { KitchenEvent } from "@/lib/mockKitchenEvents";
import { generateMockKitchenEvents, getEventStatus } from "@/lib/mockKitchenEvents";
import { KitchenEventCard } from "./KitchenEventCard";

interface UnifiedTimelineProps {
  onEventClick?: (event: KitchenEvent) => void;
}

export function UnifiedTimeline({ onEventClick }: UnifiedTimelineProps) {
  const [showCompleted, setShowCompleted] = useState(true);

  // Generate mock events
  const allEvents = useMemo(() => generateMockKitchenEvents(), []);

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
        events.sort((a, b) => a.startTime - b.startTime)
      );
    }

    return grouped;
  }, [allEvents]);

  // Get sorted dates
  const sortedDates = useMemo(
    () => Array.from(eventsByDate.keys()).sort(),
    [eventsByDate]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3 sm:px-6">
        <h1 className="text-xl font-semibold text-stone-100">Nourri</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-500">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-stone-700 bg-stone-800 text-sage-500 focus:ring-sage-500"
            />
            Show completed
          </label>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {sortedDates.map((dateStr) => {
            const events = eventsByDate.get(dateStr) ?? [];
            const date = new Date(dateStr + "T12:00:00");
            const today = isToday(date);
            const tomorrow = isTomorrow(date);

            // Filter completed events if toggle is off
            const visibleEvents = showCompleted
              ? events
              : events.filter((e) => getEventStatus(e) !== "done");

            // Separate primary and secondary events
            const primaryEvents = visibleEvents.filter(
              (e) => e.type === "cooking" || e.type === "eating"
            );
            const secondaryEvents = visibleEvents.filter(
              (e) => e.type !== "cooking" && e.type !== "eating"
            );

            if (visibleEvents.length === 0) return null;

            return (
              <section key={dateStr} className="mb-8">
                {/* Day header */}
                <div className="mb-4 flex items-center gap-2">
                  <h2
                    className={cn(
                      "font-semibold",
                      today
                        ? "text-lg text-sage-400"
                        : tomorrow
                          ? "text-base text-stone-200"
                          : "text-sm text-stone-400"
                    )}
                  >
                    {today ? "Today" : tomorrow ? "Tomorrow" : getDayName(date)}
                  </h2>
                  <span className="text-sm text-stone-600">
                    {getDayName(date, true)}, {getMonthDay(date)}
                  </span>
                </div>

                {/* Secondary events (compact row) */}
                {secondaryEvents.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {secondaryEvents.map((event) => (
                      <KitchenEventCard
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick?.(event)}
                      />
                    ))}
                  </div>
                )}

                {/* Primary events (stacked) */}
                <div className="flex flex-col gap-3">
                  {primaryEvents.map((event) => (
                    <KitchenEventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/calendar/UnifiedTimeline.tsx
git commit -m "feat: add UnifiedTimeline component"
```

---

## Task 5: Update Index Route to Use Unified Timeline

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Read current index route**

Read the file to understand current structure.

**Step 2: Replace with UnifiedTimeline**

Update the index route to use the new unified timeline:

```typescript
// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTimeline } from "@/components/calendar/UnifiedTimeline";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-stone-950">
      <UnifiedTimeline />
    </div>
  );
}
```

**Step 3: Verify in browser**

Run: `bun dev`
Expected: Browser shows unified timeline with:
- Today/Tomorrow/Future day sections
- Compact cards for kitchen tasks (defrost, grocery, dishwasher, cleanup)
- Full cards for cooking and eating events
- Detailed meal descriptions
- Status indicators (done, active, soon, upcoming)

**Step 4: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: integrate UnifiedTimeline into home page"
```

---

## Task 6: Add Export and Index Barrel

**Files:**
- Modify: `src/components/calendar/index.ts` (create if doesn't exist)

**Step 1: Check if barrel file exists and update**

Create or update the barrel export:

```typescript
// src/components/calendar/index.ts
export { CompactMealCard } from "./CompactMealCard";
export { DaySection } from "./DaySection";
export { KitchenEventCard } from "./KitchenEventCard";
export { TodayMealCard } from "./TodayMealCard";
export { TimelineView } from "./TimelineView";
export { UnifiedTimeline } from "./UnifiedTimeline";
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Run linter**

Run: `bun check`
Expected: No errors (may have warnings about unused imports in old files)

**Step 4: Commit**

```bash
git add src/components/calendar/index.ts
git commit -m "chore: add calendar component barrel exports"
```

---

## Task 7: Manual Visual QA

**No code changes - visual verification only**

**Step 1: Review in browser**

Open `http://localhost:5173` and verify:

1. **Day sections** - Today highlighted in sage, Tomorrow in lighter stone, future days muted
2. **Secondary events** - Kitchen tasks appear as compact horizontal chips
3. **Primary events** - Cooking/eating events as full cards with descriptions
4. **Meal descriptions** - Detailed, appetizing text visible
5. **Status badges** - Done shows checkmark, active shows progress
6. **Participant initials** - Show who's involved
7. **Time display** - Relative for upcoming, absolute for past

**Step 2: Test toggle**

- Uncheck "Show completed" - done events should hide
- Check it again - done events should reappear

**Step 3: Document any issues**

Note any visual issues for follow-up iteration.

---

## Task 8: Create NutritionRings Component

**Files:**
- Create: `src/components/nutrition/NutritionRings.tsx`
- Create: `src/components/nutrition/index.ts`

**Step 1: Create the NutritionRings component**

Apple-style activity rings for displaying nutrition progress:

```typescript
// src/components/nutrition/NutritionRings.tsx
import { cn } from "@/lib/utils";

export interface NutritionData {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
}

interface NutritionRingsProps {
  data: NutritionData;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}

const RING_COLORS = {
  calories: { stroke: "#ef4444", bg: "#ef444420" },  // red
  protein: { stroke: "#06b6d4", bg: "#06b6d420" },   // cyan
  carbs: { stroke: "#84cc16", bg: "#84cc1620" },     // lime
  fat: { stroke: "#f59e0b", bg: "#f59e0b20" },       // amber
};

const SIZES = {
  sm: { ring: 32, stroke: 4, gap: 5 },
  md: { ring: 56, stroke: 6, gap: 7 },
  lg: { ring: 80, stroke: 8, gap: 9 },
};

function Ring({
  progress,
  color,
  size,
  strokeWidth,
  radius,
}: {
  progress: number;
  color: { stroke: string; bg: string };
  size: number;
  strokeWidth: number;
  radius: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const center = size / 2;

  return (
    <g>
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color.bg}
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color.stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
      />
    </g>
  );
}

export function NutritionRings({
  data,
  size = "md",
  showLabels = false,
  className,
}: NutritionRingsProps) {
  const { ring: ringSize, stroke, gap } = SIZES[size];
  const metrics = [
    { key: "calories", ...data.calories, color: RING_COLORS.calories },
    { key: "protein", ...data.protein, color: RING_COLORS.protein },
    { key: "carbs", ...data.carbs, color: RING_COLORS.carbs },
    { key: "fat", ...data.fat, color: RING_COLORS.fat },
  ];

  // Calculate radii for concentric rings (outer to inner)
  const center = ringSize / 2;
  const radii = metrics.map((_, i) => center - stroke / 2 - i * (stroke + gap));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={ringSize}
        height={ringSize}
        viewBox={`0 0 ${ringSize} ${ringSize}`}
        className="flex-shrink-0"
      >
        {metrics.map((metric, i) => (
          <Ring
            key={metric.key}
            progress={metric.goal > 0 ? metric.current / metric.goal : 0}
            color={metric.color}
            size={ringSize}
            strokeWidth={stroke}
            radius={radii[i]!}
          />
        ))}
      </svg>
      {showLabels && (
        <div className="flex flex-col gap-0.5 text-xs">
          <span style={{ color: RING_COLORS.calories.stroke }}>
            {data.calories.current} / {data.calories.goal} cal
          </span>
          <span style={{ color: RING_COLORS.protein.stroke }}>
            {data.protein.current}g / {data.protein.goal}g protein
          </span>
          <span style={{ color: RING_COLORS.carbs.stroke }}>
            {data.carbs.current}g / {data.carbs.goal}g carbs
          </span>
          <span style={{ color: RING_COLORS.fat.stroke }}>
            {data.fat.current}g / {data.fat.goal}g fat
          </span>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create barrel export**

```typescript
// src/components/nutrition/index.ts
export { NutritionRings } from "./NutritionRings";
export type { NutritionData } from "./NutritionRings";
```

**Step 3: Verify build and commit**

```bash
bun run build
git add src/components/nutrition/
git commit -m "feat: add NutritionRings component with Apple-style activity rings"
```

---

## Task 9: Add PersonNutritionHeader to Timeline

**Files:**
- Create: `src/components/nutrition/PersonNutritionHeader.tsx`
- Modify: `src/components/calendar/UnifiedTimeline.tsx`
- Modify: `src/lib/mockKitchenEvents.ts` (add mock nutrition data)

**Step 1: Add mock nutrition data**

Add to `mockKitchenEvents.ts`:

```typescript
export interface PersonNutrition {
  personId: PersonId;
  name: string;
  daily: NutritionData;
}

export function getMockPersonNutrition(): PersonNutrition[] {
  return [
    {
      personId: PERSON_ALEX,
      name: "Alex",
      daily: {
        calories: { current: 1240, goal: 2000 },
        protein: { current: 68, goal: 120 },
        carbs: { current: 142, goal: 250 },
        fat: { current: 48, goal: 65 },
      },
    },
    {
      personId: PERSON_SAM,
      name: "Sam",
      daily: {
        calories: { current: 980, goal: 1800 },
        protein: { current: 52, goal: 100 },
        carbs: { current: 118, goal: 220 },
        fat: { current: 38, goal: 60 },
      },
    },
  ];
}
```

**Step 2: Create PersonNutritionHeader component**

```typescript
// src/components/nutrition/PersonNutritionHeader.tsx
import { NutritionRings } from "./NutritionRings";
import type { PersonNutrition } from "@/lib/mockKitchenEvents";

interface PersonNutritionHeaderProps {
  person: PersonNutrition;
  onSettingsClick?: () => void;
}

export function PersonNutritionHeader({
  person,
  onSettingsClick,
}: PersonNutritionHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 text-lg font-medium text-stone-300">
          {person.name.charAt(0)}
        </div>

        {/* Name and rings */}
        <div>
          <h3 className="font-medium text-stone-200">{person.name}</h3>
          <NutritionRings data={person.daily} size="sm" />
        </div>
      </div>

      {/* Nutrition summary */}
      <div className="hidden sm:flex flex-col gap-0.5 text-xs text-stone-500">
        <span>{person.daily.calories.current} / {person.daily.calories.goal} cal</span>
        <span>P: {person.daily.protein.current}g · C: {person.daily.carbs.current}g · F: {person.daily.fat.current}g</span>
      </div>

      {/* Settings button */}
      {onSettingsClick && (
        <button
          type="button"
          onClick={onSettingsClick}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
```

**Step 3: Add to UnifiedTimeline**

Update UnifiedTimeline to include person headers at the top.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add PersonNutritionHeader with daily nutrition summary"
```

---

## Task 10: Add Mini Rings to KitchenEventCard

**Files:**
- Modify: `src/lib/mockKitchenEvents.ts` (add nutrition per event)
- Modify: `src/components/calendar/KitchenEventCard.tsx`

**Step 1: Add nutrition data to events**

Update `KitchenEvent` interface and mock data to include estimated nutrition:

```typescript
// Add to KitchenEvent interface
nutrition?: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
```

Add rough estimates to each eating event in mock data.

**Step 2: Add mini rings to KitchenEventCard**

For eating events, show mini nutrition rings in the card header.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add mini nutrition rings to meal cards"
```

---

## Summary

After completing all tasks, the unified kitchen timeline prototype will be functional with:

- 3-day mock scenario (Sunday-Tuesday)
- Event types: cooking, eating, defrost, grocery, dishwasher, cleanup
- Primary cards (cooking/eating) with full details and descriptions
- Secondary cards (tasks) compact and unobtrusive
- Status system: upcoming, soon, active, done, overdue
- Toggle to show/hide completed events
- **Apple-style nutrition rings per person**
- **Mini nutrition rings on meal cards**
- **Settings button for profile access**

This validates the UX design before building the real data model.
