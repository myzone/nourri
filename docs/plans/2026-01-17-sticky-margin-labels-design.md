# Sticky Margin Day/Time Labels

## Summary

Move day labels (Today, Tomorrow, etc.) and time labels (now indicator) from inline with the timeline to a left margin column with sticky scroll behavior. Cards and timeline dots remain unchanged.

## Current State

- Day separators: dot on track + inline text ("Today" + "Jan 18") + decorative line
- Now line: pulsing dot on track + decorative line + time text ("7:20 pm")
- All elements scroll together inside a single container

## New Design

### Layout Structure

```
[ margin column ][ timeline content column           ]
  (sticky labels)  (dots + decorative lines + cards)
  ~60-80px wide    (scrolls naturally)
```

### Margin Column

- Contains day labels and time label
- Labels use `position: sticky` to stay visible while scrolling
- Each label aligns vertically with its corresponding dot on the timeline

### Day Labels

- Display: Day name ("Today", "Tomorrow", "Monday", etc.)
- Sublabel: Date ("Jan 18") - smaller, muted
- Sticky behavior: sticks to top until next day pushes it out
- Tap action: scroll to that day section

### Time Label (Now)

- Display: Current time ("7:20 pm") in terra-400 color
- Sticky behavior: stacks below current day label
- Tap action: scroll to now position

### Timeline Content (unchanged)

- Dots remain on the vertical track at left edge
- Decorative lines extend right (no text at end anymore)
- Event cards completely unchanged
- Gap/spacing calculations unchanged

## Implementation

### Files to Modify

1. `src/components/calendar/UnifiedTimeline.tsx`
   - Add margin column to layout
   - Extract day text to margin, keep dot + line inline
   - Extract time text from NowLine to margin, keep pulsing dot + line inline
   - Implement sticky positioning

### Files Unchanged

- `src/components/calendar/KitchenEventCard.tsx`
- All other components

### Sticky Stacking

```css
/* Day label */
.day-label {
  position: sticky;
  top: 0;
}

/* Time label - stacks below day */
.time-label {
  position: sticky;
  top: 24px; /* height of day label */
}
```

## Interaction

- Tap day label: smooth scroll to that day's first event
- Tap time label: smooth scroll to now position
- Labels stick at top of viewport until pushed by next label
