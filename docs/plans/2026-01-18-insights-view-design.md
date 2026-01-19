# Insights View Design

## Overview

A nutrition intelligence system that surfaces actionable insights alongside a timeline-based view, maintaining UX consistency with the Schedule view.

## Core Concept

The Insights view is **not a dashboard with static widgets**. It's a **prioritized feed of problems and highlights** that evolves as the user addresses issues.

Example flow:
1. User sees "Protein below target this week" (high priority)
2. User adjusts meals, protein improves
3. Now "Sodium trending high" surfaces as the next priority
4. Persistent issues like "Vitamin D low for 3 weeks" remain visible

The system does the analysis; the user sees what matters now.

## Navigation

Header structure (consistent across app):
```
[Nourri]  Schedule  Insights  ···  [Alex] [Sam]  [⚙]
```

- **Nourri logo**: Navigate to Schedule + scroll to now
- **Schedule**: Timeline of meals and kitchen events
- **Insights**: Nutrition intelligence feed
- **Person pickers**: Filter by household member (shared state)
- **Settings**: App configuration

## Timeline Structure

Same vertical timeline as Schedule for uniform UX:
- Day separators with date labels
- "Now" marker with pulsing dot
- Cards positioned along the timeline
- Person filter affects all displayed data

### Card Types

**1. Daily Summary Card**
- Appears once per day (past days only)
- Compact macro overview: calories, protein, carbs, fat
- Progress bars showing consumed vs target
- Visual indicator for over/under

**2. Insight Card**
- Problem or highlight surfaced by the system
- Priority-ordered (high severity first)
- Timeframe-aware (today, this week, last 30 days)
- Actionable (pin, dismiss, navigate to fix)

**3. Trend Card** (periodic)
- Appears at meaningful intervals (weekly, monthly)
- Sparkline or area chart visualization
- Key metric with trend direction
- Examples: weight trend (monthly), expenditure (weekly)

## Insight System

### Data Model

```typescript
interface Insight {
  id: string;
  severity: "low" | "medium" | "high";
  timeframe: "today" | "this_week" | "last_30_days" | "trend";
  category: InsightCategory;
  title: string;
  detail: string;
  trend: "improving" | "stable" | "declining";
  pinned: boolean;
  dismissedAt: number | null;
  source: DataSource;
  participants: PersonId[];
  createdAt: number;
}

type InsightCategory =
  | "macro"      // calories, protein, carbs, fat
  | "micro"      // vitamins, minerals
  | "amino"      // amino acid distribution
  | "balance"    // overall dietary balance
  | "habit"      // consistency, streaks
  | "trend";     // long-term patterns

type DataSource =
  | "nourri"        // nutrition from meals, supplements, food logging
  | "apple_health"; // weight, sleep, activity from HealthKit
```

### Priority Algorithm

Insights ordered by:
1. Severity (high → medium → low)
2. Recency (newer issues first within same severity)
3. Persistence (long-standing issues get boosted)
4. Pinned items always visible

Dismissed insights hidden for their timeframe, resurface if problem persists.

### Insight Categories

**Macronutrients**
- Calorie deficit/surplus
- Protein below target
- Carb/fat imbalance
- Fiber intake

**Micronutrients**
- Vitamin deficiencies (A, C, D, B12, etc.)
- Mineral gaps (iron, calcium, magnesium, zinc)
- Excess warnings (sodium, sugar)

**Amino Acids**
- Complete protein assessment
- Essential amino acid coverage
- Leucine threshold for muscle synthesis

**Source Attribution**
- Food vs supplement breakdown
- Identify over-reliance on supplements
- Highlight whole food gaps

**Trends**
- Weight trajectory
- Energy expenditure changes
- Consistency patterns

## Interaction Patterns

### Pinning
User can pin an insight to keep it visible regardless of priority. Useful for tracking specific goals or known issues being actively addressed.

### Dismissing
Temporarily hide an insight. It will resurface if:
- The timeframe resets (new week/month)
- The problem significantly worsens
- User explicitly un-dismisses

### Acting
Insights can link to relevant actions:
- "Fix in Schedule" → navigate to meal planning
- "Learn more" → educational content (future)
- "View details" → expanded breakdown

## Data Sources

### Nourri (Primary)
- All nutrition data: meals, supplements, food logging
- Macro and micronutrient calculations
- Amino acid profiles
- Aggregated by day, week, month
- Per-person breakdown

### Apple Health (Complementary)
- Weight and body measurements
- Activity and energy expenditure
- Sleep data for recovery context
- Import via HealthKit APIs
- Enhances insights but doesn't replace Nourri data

## Visual Design

Follows existing Nourri design system:
- **Colors**: stone (neutrals), sage (positive/on-target), terra (warning/attention)
- **Typography**: DM Sans, tabular nums for data
- **Cards**: rounded-xl, stone-900 background, subtle borders
- **Progress bars**: colored by macro type, terra when over target

### Insight Card Layout

```
┌─────────────────────────────────────────┐
│ [●] Protein below target     [pin] [×] │
│     This week · Macro                   │
│                                         │
│     Averaging 68g vs 120g goal          │
│     ████████░░░░░░░░░░░░  57%          │
│                                         │
│     ↗ Improving from last week          │
└─────────────────────────────────────────┘
```

### Daily Summary Card Layout

```
┌─────────────────────────────────────────┐
│ Calories   ████████████░░░  1842/2000   │
│ Protein    ████████░░░░░░░    68/120g   │
│ Carbs      ██████████████░   232/250g   │
│ Fat        ████████████░░░    58/65g    │
└─────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation
- [x] Shared header with navigation
- [x] Person filter store (shared state)
- [x] Route setup (/insights)
- [x] Basic timeline structure
- [x] Daily summary cards with mock data

### Phase 2: Insight System
- [ ] Insight data model and types
- [ ] Mock insight generation
- [ ] Insight card component
- [ ] Priority sorting
- [ ] Pin/dismiss interactions

### Phase 3: Intelligence
- [ ] Real nutrition aggregation from meals
- [ ] Insight detection algorithms
- [ ] Trend calculations
- [ ] Multi-timeframe analysis

### Phase 4: Trend Visualizations
- [ ] Sparkline component
- [ ] Trend card with charts
- [ ] Time range selectors
- [ ] Weight/expenditure tracking

### Phase 5: Apple Health Integration
- [ ] HealthKit import (weight, sleep, activity)
- [ ] Source attribution in insights
- [ ] Cross-source correlations (sleep vs energy, weight vs intake)

## Decisions

1. **Amino acid data**: Food composition database with amino acid profiles, enriched by Nourri meal data.

2. **Insight thresholds**: User-configurable in settings. Defaults based on Peter Attia's longevity guidelines:
   - Higher protein targets (~1g/lb body weight)
   - Elevated vitamin D targets (40-60 ng/mL)
   - Leucine threshold for muscle protein synthesis (~2.5-3g per meal)
   - Emphasis on metabolic health markers

3. **Household aggregation**:
   - Combinable (aggregate view): weight trends, expenditure graphs
   - Per-person only: nutrition insights (macros, micros, amino acids) - individual bodies need individual tracking

4. **Notifications**: None. Insights are in-app only - user checks when they want.

## Open Questions

1. **Historical depth**: How far back should trend analysis go? Leave flexible for now.

2. **Food database**: Which database provides amino acid profiles? USDA FoodData Central? Licensed alternatives?

## References

Design inspiration from:
- MacroFactor (adaptive nutrition tracking)
- Cronometer (detailed micro tracking)
- Levels (CGM-style insight surfacing)
