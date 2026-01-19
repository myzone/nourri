# Meal Rejection & Regeneration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to reject meal suggestions and pick from alternatives, with automatic regeneration of other meals for nutritional balance.

**Architecture:** Dislike button triggers inline carousel of alternatives. Selection updates meal and regenerates other unpinned meals. Toast confirms changes.

**Tech Stack:** React components, Zustand state (future), mock data for now

---

## User Flow

1. User sees unpinned meal card (dashed border = suggestion)
2. Card shows dislike button in action area (hidden when pinned)
3. User taps dislike button
4. Card transforms into horizontal carousel:
   - 3 alternative meal suggestions
   - 1 "Skip meal" option (last)
5. User swipes through options
6. User taps selection:
   - **Alternative:** Becomes new meal (stays unpinned)
   - **Skip:** Meal slot removed from timeline
   - **Outside/cancel:** Keep original suggestion
7. Other unpinned meals regenerate (mocked as random swap)
8. Toast: "X meals adjusted for balance"

## UI Components

### Dislike Button
- Location: Card action area (with pin/confirm)
- Icon: Refresh/swap icon (↻)
- Visibility: Only on unpinned meals
- Style: `text-stone-600 hover:text-stone-400`

### Alternative Carousel
- Replaces meal card in-place
- Horizontal scroll with snap
- 4 items: 3 alternatives + skip
- Compact cards showing:
  - Main dish name
  - 1-2 sides
  - Mini nutrition indicator (optional)

### Skip Option
- Last item in carousel
- Dashed border style
- "Skip meal" text + icon
- Removes meal slot when selected

### Toast Notification
- Position: Bottom center
- Content: "X meals adjusted for balance"
- Duration: 3 seconds
- Style: Dark stone background

### Selection State
- Other cards dimmed (opacity)
- Timeline scroll disabled
- Tap outside to cancel

## Data Model

### Alternative Meals Pool
```typescript
// Pool of alternative meals for random selection
const ALTERNATIVE_MEALS: MealDescription[] = [
  { main: "Grilled chicken salad", sides: ["Mixed greens"] },
  { main: "Veggie stir-fry", sides: ["Brown rice"] },
  { main: "Salmon poke bowl", sides: ["Edamame"] },
  // ... more options
];
```

### State
```typescript
interface TimelineState {
  events: KitchenEvent[];
  activeCarouselEventId: string | null;  // Which meal has carousel open

  // Actions
  openCarousel: (eventId: string) => void;
  closeCarousel: () => void;
  selectAlternative: (eventId: string, meal: MealDescription) => void;
  skipMeal: (eventId: string) => void;
}
```

## Mockup Scope

**Building:**
- Dislike button on unpinned cards
- Carousel component with mock alternatives
- Skip meal option
- Selection interaction
- Toast notification
- Visual states (open/closed, dimming)

**Mocked:**
- Alternatives: Random from pre-defined pool
- Regeneration: Random shuffle of unpinned meals
- Toast count: Count of unpinned meals

**Not building:**
- Real nutrition optimization
- AI-powered suggestions
- User preference learning
- Backend/API integration

## Component Structure

```
UnifiedTimeline
├── KitchenEventCard (existing)
│   └── DislikeButton (new - only when unpinned)
├── MealAlternativeCarousel (new)
│   ├── AlternativeCard (new - compact meal card)
│   └── SkipMealCard (new)
└── RegenerationToast (new)
```

## Implementation Tasks

1. Add dislike button to KitchenEventCard
2. Create AlternativeCard component (compact meal display)
3. Create MealAlternativeCarousel component
4. Create SkipMealCard component
5. Add carousel state to UnifiedTimeline
6. Implement selection logic (pick/skip/cancel)
7. Add mock regeneration function
8. Create RegenerationToast component
9. Add dimming overlay when carousel open
10. Add alternative meals pool to mock data
