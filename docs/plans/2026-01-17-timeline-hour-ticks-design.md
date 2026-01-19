# Timeline Hour Ticks Design

## Problem

The current timeline uses logarithmic spacing between events (8-48px based on time gap), which doesn't visually convey actual time elapsed. Users can't intuit whether there's a 30-minute or 3-hour gap between meals. This matters for:
- Understanding daily eating patterns at a glance
- Future fasting period visualization (placing fasting blocks in gaps)
- Future drag-to-reschedule interactions (hour ticks as a ruler/guide)

## Solution

Add hour tick marks to the left margin of the timeline, with smart collapsing for large gaps.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Time scale | Single day focus, scrollable across multiple days |
| Gap visualization | Collapsible gaps with hour markers |
| Card layout | Keep exactly as-is (time info stays in card) |
| Collapsed gap style | Minimal dashed line with "Xh gap" label |
| Hour tick placement | Left margin, aligned with day labels |
| Collapse threshold | Show up to 2 hour ticks, collapse beyond |

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  [Header: Nourri logo + person filters]             │
├─────────────────────────────────────────────────────┤
│                                                     │
│   Today ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│   Jan 17  │                                         │
│           │                                         │
│   8 AM    ●──┬────────────────────────────────┐    │
│           │  │ in 15m    EAT Oatmeal          │    │
│           │  │ 8:15 AM   + Berries    👤👤    │    │
│           │  └────────────────────────────────┘    │
│           │                                         │
│   9 AM   ─┼─  ← hour tick (small dash)             │
│           │                                         │
│          ─┼─  ╌╌ 3h gap ╌╌  ← collapsed gap        │
│           │                                         │
│  12 PM    ●──┬────────────────────────────────┐    │
│           │  │ in 4h     EAT Lunch            │    │
│           │  └────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Hour Tick & Gap Collapse Logic

**When to show hour ticks:**
- Between any two events, calculate the time gap
- If gap spans ≤2 full hours: show each hour tick (e.g., 9 AM, 10 AM)
- If gap spans >2 full hours: collapse to "Xh gap" indicator

**Examples:**

```
Event at 8:30 AM → Event at 10:15 AM (1h 45m gap)
────────────────────────────────────────
   8 AM    ●──[Breakfast card]
           │
   9 AM   ─┼─   ← show this tick
          ─┼─
  10 AM   ─┼─   ← show this tick
           │
           ●──[Snack card]


Event at 8:30 AM → Event at 1:00 PM (4h 30m gap)
────────────────────────────────────────
   8 AM    ●──[Breakfast card]
           │
   9 AM   ─┼─   ← show (1st tick)
           │
  10 AM   ─┼─   ← show (2nd tick)
           ┊
           ┊  ╌╌ 3h gap ╌╌  ← collapse remaining
           ┊
   1 PM    ●──[Lunch card]
```

**Spacing:**
- Hour ticks: fixed spacing (48px per hour) for proportional feel
- Collapsed gaps: minimal space (~24px) with label

## Visual Styling

**Hour tick appearance:**
- Label: `text-xs text-stone-600` - subtle, doesn't compete with event times
- Tick mark: short horizontal line crossing timeline track, `bg-stone-700`
- Positioned in left margin (same area as day labels, but smaller/lighter)

**Collapsed gap appearance:**
- Dashed vertical segment replacing solid timeline
- Label: `text-xs text-stone-500` centered, e.g., "3h gap"
- On hover/tap: subtle highlight (future expandability)

**Hierarchy:**
- Day labels: `text-sm text-stone-100` (Today) or `text-xs text-stone-500` (other)
- Hour labels: `text-xs text-stone-600` - intentionally lighter than day labels
- Now line: terra-colored pulsing dot - most prominent marker

## Edge Cases

1. **Gap at start of day:** Day separator indicates date, first hour tick appears before first event if meaningful gap exists

2. **Gap spanning midnight:** Collapsed gap shows "Xh gap" without crossing day boundaries - day separator handles transition

3. **Events within same hour:** No hour tick between them - just normal event spacing

4. **"Now" line interaction:** Coexists with hour ticks (now line is more prominent)

5. **Small gaps (<1h):** No hour ticks - just existing logarithmic spacing

## Future-Ready

- Collapsed gaps are tappable (wired for future expand/fasting feature)
- Hour ticks provide visual anchors for drag-to-reschedule

## Implementation Notes

Modify `UnifiedTimeline.tsx`:
1. Calculate hour boundaries between events
2. Insert hour tick elements into `flattenedEvents` or render them separately
3. Replace solid timeline segment with dashed for collapsed gaps
4. Add gap label component

Keep `KitchenEventCard.tsx` unchanged.
