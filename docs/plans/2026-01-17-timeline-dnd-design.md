# Timeline Drag-and-Drop Design

## Problem

Users need to reschedule meals by dragging cards to new times. The hour ticks we added provide a visual ruler, but the collapsed gaps hide the true time scale during manipulation.

## Solution

Drag-and-drop with timeline expansion: when dragging starts, collapsed gaps unfold to show a linear time scale (like a calendar). The card follows the cursor, showing real-time feedback. On drop, the timeline collapses back.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Time precision | 5-minute increments |
| Day boundaries | Same day only |
| Visual feedback | Card follows cursor, hour ticks as reference |
| Library | @dnd-kit (touch support, accessibility) |
| Collision handling | Block overlaps, snap to nearest valid position |
| Timeline during drag | Expand to linear scale (60px/hour) |

## Interaction Model

**Drag initiation:** Long-press (300ms) or mouse-down-and-move on a card.

**During drag:**
- Card lifts with shadow, follows cursor/finger
- Original position shows faint ghost outline
- Time label updates in real-time
- Hour ticks highlight as you pass them
- Red tint + blocked indicator if position would overlap

**Drop behavior:**
- Valid position → animate to new time, update timestamps
- Invalid position (overlap) → animate back to original
- Time rounds to nearest 5 minutes

**Constraints:**
- Vertical bounds within same day
- Cannot overlap events for same participants

## Timeline Expansion Animation

**On drag start:**
1. Collapsed gaps expand to show all hour ticks
2. Spacing becomes linear (60px per hour)
3. Events reposition to true time-scaled locations
4. Scroll adjusts to keep dragged card visible

**On drag end:**
1. Card settles (or returns if invalid)
2. Timeline collapses back smoothly
3. Large gaps re-collapse to "Xh" indicators

## Technical Architecture

**Dependencies:**
- `@dnd-kit/core` - drag sensors, DndContext
- `@dnd-kit/utilities` - CSS transform helpers

**Component structure:**
```
UnifiedTimeline
├── DndContext
│   └── TimelineContent
│       ├── DaySeparator
│       ├── HourTick (all visible during drag)
│       ├── DraggableEventCard (useDraggable)
│       └── DroppableZone (timeline area)
```

**State additions:**
- `isDragging: boolean` - triggers linear expansion
- `draggedEventId: string | null` - which card is being dragged
- `dragPreviewTime: number | null` - preview time during drag

**Position calculation:**
- Compact mode: existing relative layout
- Linear mode: `top = ((time - dayStartMs) / HOUR_MS) * 60`
- Transition via CSS `transition: top 300ms ease-out`

**Collision detection:**
```typescript
isOverlapping = events.some(e =>
  e.id !== draggedId &&
  timesOverlap(previewStart, previewEnd, e.startTime, e.endTime)
);
```

## Data Update

```typescript
setEvents(prev => prev.map(e =>
  e.id === draggedId
    ? {
        ...e,
        startTime: newStartTime,
        endTime: e.endTime ? newStartTime + (e.endTime - e.startTime) : null,
      }
    : e
));
```

## Edge Cases

- **Past events:** Draggable (correct logged times)
- **Active events:** Draggable (adjust current meal)
- **Scroll during drag:** dnd-kit auto-scroll
- **Multi-participant:** Check all participants' events
- **Pinned events:** Draggable (pinned = locked from AI, not user)

## Accessibility

- Keyboard: Arrow keys ±5min, Enter to confirm
- Screen reader: Announce time changes
