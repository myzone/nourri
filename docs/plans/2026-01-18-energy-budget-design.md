# Energy Budget Design

## Overview

A full-page energy budget visualization that shows the running balance between energy intake (food) and expenditure (passive + active) throughout the day. Helps users understand their metabolic rhythm and how meals and exercise affect their energy state.

## Core Concept

The view answers: "Where is my energy throughout the day?"

- **Y-axis**: Running energy balance (kcal), starting from 0 at midnight
- **Food events**: Push the balance UP (energy in)
- **Exercise events**: Push the balance DOWN (active energy out)
- **Passive burn (BMR)**: Gradual downward slope throughout the day
- **Uncertainty band**: Widens when data is missing or stale

```
        │    🍽️              🍽️         🍽️
    +500├────●───────────────●──────────●────
        │     ╲             ╱ ╲        ╱ ╲
       0├──────╲───────────╱───╲──────╱───╲──
        │       ╲    🏃   ╱     ╲    ╱     ╲
   -500 ├────────╲──●────╱───────╲──╱───────╲
        │         ╲╱
        └──────────────────────────────────────
         12am    6am    12pm    6pm    12am
```

## Layout

Apple Health-style dashboard approach:

```
┌─────────────────────────────────────────┐
│  Energy Budget                     ⚙️   │
├─────────────────────────────────────────┤
│  [D]  [W]  [M]  [3M]  [Y]    (tabs)     │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│       Full-width energy chart           │
│       with event markers                │
│       + uncertainty band                │
│                                         │
│       (scrollable for longer ranges)    │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Key points:**
- Time range tabs (Day / Week / Month / 3M / Year)
- Global person filter in header handles user switching
- Chart fills the page (100% width, no card grid)
- Event markers are interactive (tap to see details)

## Energy Model

### Sources

**Energy In (pushes balance up):**
- Meals from Nourri calendar
- Logged food/snacks
- Each event shows kcal value

**Energy Out (pushes balance down):**
- **Passive (BMR)**: Estimated from weight, age, sex, activity level
- **Active**: Exercise from Apple Health or manual logs
- Creates continuous downward slope punctuated by exercise events

### Mass Delta

Weight changes validate the model:
- Expected: calculated from energy balance
- Actual: from weigh-ins
- Discrepancy = model needs calibration

If user weighs in regularly, model self-corrects over time.

### Uncertainty Band

The band widens when confidence is low:

| Condition | Effect |
|-----------|--------|
| No weigh-in today | Band widens (BMR estimate less certain) |
| No weigh-in in 3+ days | Band widens significantly |
| Low activity data | Active energy estimated |
| Meal without portions | Calorie value guessed |
| More exercise data | Band tightens (better active energy measurement) |
| Detailed food logging | Band tightens |

Visual: semi-transparent fill around the main line that expands/contracts.

## Event Markers

Icons positioned on top of the chart at event times:

**Meals** (🍽️ or fork/knife icon)
- Positioned at meal time
- Size or opacity could indicate kcal magnitude
- Tap to expand: meal name, time, kcal, macros, participants

**Exercise** (🏃 or activity icon)
- Positioned at exercise time
- Tap to expand: activity type, duration, kcal burned

**Interaction:**
- Tap marker → popover with details
- The curve behind shows the metabolic impact

## Time Range Views

### Day View (D)

- Full 24-hour view (12am to 12am)
- Individual meal and exercise markers
- Highest resolution: see each event's impact
- Default view

### Week View (W)

- 7 columns or continuous 7-day chart
- Shows daily patterns and consistency
- Meal/exercise markers aggregated or summarized
- Daily net balance visible (+240, -180, etc.)
- Tap day to drill into day view

### Month View (M)

- 30-day aggregated trend
- Shows average daily curve or daily net balances
- Pattern detection: "weekends trend +300 kcal"
- Less individual event detail, more pattern focus

### 3-Month / Year Views (3M, Y)

- Long-term trend line
- Weight overlay option (actual mass delta vs estimated)
- Rolling averages smooth out daily noise
- Goal progress visible

## Multi-User Support

Uses existing global person filter from header:
- Person selector in header already works app-wide
- Energy Budget shows selected person's data
- Consistent with Schedule view behavior

No special per-person UI within the page.

## Visual Design

Follows existing Nourri design system:

**Colors:**
- Background: `stone-950`
- Chart line: sage or terra accent
- Uncertainty band: semi-transparent fill (stone-700 at 30% opacity)
- Positive balance zone: subtle green tint
- Negative balance zone: subtle amber/red tint (or neutral depending on user goals)

**Event markers:**
- Filled circles with icon inside
- Meals: stone-800 background, fork icon
- Exercise: stone-800 background, activity icon
- On tap: popover with details

**Typography:**
- Axis labels: stone-400, small
- Values: tabular-nums for alignment
- Time labels along x-axis

**Responsive behavior:**
- Tablet: Full chart, comfortable touch targets
- Mobile: Same layout, chart may need horizontal scroll for day view
- Mac: Max-width container, same as tablet

## Data Sources

### Nourri (Primary)

- Meal events from calendar (MealSlot)
- Food logging (when available)
- Calorie and macro data per meal
- Participant info for household context

### Apple Health (Complementary)

- Weight measurements (mass delta)
- Active energy (exercise)
- Resting energy (BMR calibration)
- Workout events
- Sleep data (optional: affects BMR)

## Implementation Notes

### Existing Components to Leverage

- `usePersonFilterStore` - global person filtering
- `useCalendarStore` - meal slot data
- Mock trend generators in `src/lib/mockTrends.ts`
- Dark stone color palette established

### New Components Needed

- `EnergyBudgetChart` - main SVG/Canvas chart
- `TimeRangeTabs` - D/W/M/3M/Y selector
- `EventMarker` - interactive meal/exercise icons
- `EventPopover` - detail view on marker tap
- `UncertaintyBand` - visual uncertainty representation

### Data Flow

1. Load meal slots for selected date range
2. Load exercise/weight data from health store (mock for now)
3. Calculate running energy balance curve
4. Calculate uncertainty band width per time segment
5. Render chart with events overlaid
6. Handle marker interactions

## Open Questions

1. **Curve smoothing**: Should the energy line be stepped (jumps at events) or smoothed (gradual transitions)?

2. **Deficit/surplus coloring**: Should we color-code based on user goals? (e.g., deficit = good for weight loss, bad for muscle gain)

3. **Future days**: Show planned meals without metabolic data, or hide entirely?

4. **Comparison mode**: Allow comparing two time periods? (this week vs last week)
