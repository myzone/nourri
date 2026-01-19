# Nourri - Product Design Spec

## Vision

Nourri helps households plan, cook, and track meals with minimal friction. The focus is on **what's next** - not elaborate meal planning for weeks ahead.

## Core Philosophy

1. **Present-focused** - Today and tomorrow matter. Next week can wait.
2. **Action-oriented** - Every screen answers "what do I do now?"
3. **Honest logging** - Capture what actually happened, not just what was planned
4. **Cooking-aware** - Food needs to be cooked. If you haven't started, you need a backup plan.

## Key Concepts

### Meal Slots
A time block when someone eats. Not "breakfast/lunch/dinner" rigidly - just a slot with a time and what's being eaten.

**Future idea:** AI-generated slot names based on context (time of day, what's planned, who's eating). "Quick weekday breakfast" vs "Sunday brunch with family" - inferred, not configured.

### Cooking Sessions
Separate from eating. Cooking often happens before the meal slot. Track:
- What's being cooked
- When cooking should start (based on recipe prep time)
- Whether cooking has actually started

**Key insight:** If cooking hasn't started and the meal is soon, the user needs to pivot. Show this clearly.

### Meal Status Flow
```
planned → cooking_started → ready → eaten
                ↓
         needs_replacement (cooking didn't start in time)
```

### Logging Reality
When a meal slot passes, capture what really happened:
- `as_planned` - Ate what was planned
- `modified` - Similar to plan but adjusted
- `substitute` - Completely different meal
- `ate_out` - Went to restaurant/takeout
- `skipped` - Didn't eat this slot

## Timeline UX

### Structure
1. **Up Next** - The immediate meal needing attention (hero)
2. **Today** - Remaining meals today
3. **Tomorrow** - Preview to build anticipation
4. **Coming Up** - Collapsed summary of next 5 days

### "Up Next" Logic
Show the next meal that needs action:
- If a meal is upcoming and cooking hasn't started → "Start cooking or find alternative"
- If a meal is upcoming and cooking is done → "Ready to eat"
- If current meal slot is active → "Log what you ate"

### Meal Cards - What to Show
Primary info (always visible):
- **Meal name** (descriptive, appetizing: "Creamy mushroom risotto" not "Dinner")
- **Time** (relative when close: "in 2 hours", absolute otherwise)
- **Cooking status** (not started / in progress / ready)
- **Who's eating** (avatars)

Secondary info (on expand):
- Ingredients needed
- Prep/cook time
- Notes

### What NOT to Show
- Meal type labels (breakfast/lunch/dinner) - the time tells the story
- Detailed nutrition - not the core value prop
- Complex scheduling UI - keep it simple

## Meal Descriptions

Meals should be described in appetizing, concrete terms:

**Good:**
- "Creamy mushroom risotto with parmesan"
- "Quick avocado toast with poached eggs"
- "Slow-cooked pulled pork tacos"
- "Greek salad with grilled chicken"

**Bad:**
- "Dinner"
- "Lunch - healthy"
- "Greek yogurt" (too generic)
- "Food"

The description should make you hungry or at least know exactly what you're eating.

## Cooking Guidance

When a meal is approaching:

### Happy Path
```
┌─────────────────────────────────────────┐
│ Creamy mushroom risotto                 │
│ Ready in 45 min · Serves 2              │
│                                         │
│ [Start cooking]                         │
└─────────────────────────────────────────┘
```

### Needs Attention
```
┌─────────────────────────────────────────┐
│ ⚠️ Creamy mushroom risotto              │
│ Dinner in 30 min · Takes 45 min to cook │
│                                         │
│ You might not have enough time.         │
│                                         │
│ [Start anyway] [Find something quick]   │
└─────────────────────────────────────────┘
```

### Pivot Needed
```
┌─────────────────────────────────────────┐
│ 🔄 Need a new plan for dinner           │
│ Risotto takes too long now              │
│                                         │
│ Quick options:                          │
│ • Pasta with store sauce (15 min)       │
│ • Eggs & toast (10 min)                 │
│ • Order takeout                         │
│                                         │
│ [Pick one] [I'll figure it out]         │
└─────────────────────────────────────────┘
```

## Future Features (Not MVP)

- **AI slot naming** - Infer "Saturday brunch" vs "Quick Tuesday lunch"
- **Recipe integration** - Import recipes, auto-calculate cook times
- **Grocery integration** - Know what's in the house
- **Multi-person coordination** - Who's cooking, who's eating where
- **Meal suggestions** - Based on what's in inventory + preferences
- **Historical patterns** - "You usually eat light on Mondays"

## Technical Notes

- All data local-first (Yjs CRDT)
- Offline-capable
- Sync across devices (future)
- No account required for single-device use
