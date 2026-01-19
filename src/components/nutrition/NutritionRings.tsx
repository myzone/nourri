// src/components/nutrition/NutritionRings.tsx
import { useMemo } from "react";

// === Types ===

interface NutrientValue {
	current: number;
	goal: number;
}

// Core macros (main rings)
export interface MacroData {
	calories: NutrientValue;
	protein: NutrientValue;
	carbs: NutrientValue;
	fat: NutrientValue;
}

// Micronutrients
export interface MicroData {
	fiber: NutrientValue;
	sugar: NutrientValue;
	sodium: NutrientValue;
}

// Key vitamins/minerals
export interface VitaminData {
	vitaminA: NutrientValue;
	vitaminC: NutrientValue;
	vitaminD: NutrientValue;
	iron: NutrientValue;
	calcium: NutrientValue;
}

// Full nutrition data
export interface NutritionData {
	macros: MacroData;
	micros?: MicroData;
	vitamins?: VitaminData;
}

// Legacy format for backwards compatibility
export interface LegacyNutritionData {
	calories: NutrientValue;
	protein: NutrientValue;
	carbs: NutrientValue;
	fat: NutrientValue;
}

type RingSize = "sm" | "md" | "lg";

interface NutritionRingsProps {
	data: NutritionData | LegacyNutritionData;
	size: RingSize;
	showLabels?: boolean;
	showMicros?: boolean;
}

// === Constants ===

const MACRO_COLORS = {
	calories: { stroke: "#ef4444", bg: "#ef444420", label: "Cal" },
	protein: { stroke: "#06b6d4", bg: "#06b6d420", label: "Pro" },
	carbs: { stroke: "#84cc16", bg: "#84cc1620", label: "Carb" },
	fat: { stroke: "#f59e0b", bg: "#f59e0b20", label: "Fat" },
} as const;

const MICRO_COLORS = {
	fiber: { stroke: "#8b5cf6", bg: "#8b5cf620", label: "Fiber" },
	sugar: { stroke: "#ec4899", bg: "#ec489920", label: "Sugar" },
	sodium: { stroke: "#6366f1", bg: "#6366f120", label: "Na" },
} as const;

const VITAMIN_COLORS = {
	vitaminA: { stroke: "#f97316", bg: "#f9731620", label: "A" },
	vitaminC: { stroke: "#eab308", bg: "#eab30820", label: "C" },
	vitaminD: { stroke: "#22c55e", bg: "#22c55e20", label: "D" },
	iron: { stroke: "#78716c", bg: "#78716c20", label: "Fe" },
	calcium: { stroke: "#e2e8f0", bg: "#e2e8f020", label: "Ca" },
} as const;

const SIZES = {
	sm: { ring: 32, stroke: 4, gap: 5 },
	md: { ring: 56, stroke: 6, gap: 7 },
	lg: { ring: 80, stroke: 8, gap: 9 },
} as const;

type MacroKey = keyof typeof MACRO_COLORS;
type MicroKey = keyof typeof MICRO_COLORS;
type VitaminKey = keyof typeof VITAMIN_COLORS;

// Order from outer to inner
const MACRO_ORDER: MacroKey[] = ["calories", "protein", "carbs", "fat"];
const MICRO_ORDER: MicroKey[] = ["fiber", "sugar", "sodium"];
const VITAMIN_ORDER: VitaminKey[] = ["vitaminA", "vitaminC", "vitaminD", "iron", "calcium"];

// Helper to detect legacy data format
function isLegacyData(data: NutritionData | LegacyNutritionData): data is LegacyNutritionData {
	return "calories" in data && !("macros" in data);
}

// Convert legacy to new format
function normalizeMacros(data: NutritionData | LegacyNutritionData): MacroData {
	if (isLegacyData(data)) {
		return {
			calories: data.calories,
			protein: data.protein,
			carbs: data.carbs,
			fat: data.fat,
		};
	}
	return data.macros;
}

// === Ring SVG Component ===

interface RingSVGProps {
	ringSize: number;
	stroke: number;
	gap: number;
	nutrients: Array<{
		key: string;
		current: number;
		goal: number;
		colors: { stroke: string; bg: string; label: string };
	}>;
}

function RingSVG({ ringSize, stroke, gap, nutrients }: RingSVGProps) {
	const center = ringSize / 2;

	const rings = nutrients.map((nutrient, index) => {
		const progress = nutrient.goal > 0 ? Math.min(nutrient.current / nutrient.goal, 1) : 0;
		const radius = (ringSize - stroke) / 2 - index * (stroke + gap);
		const circumference = 2 * Math.PI * radius;
		const dashOffset = circumference * (1 - progress);

		return { ...nutrient, radius, circumference, dashOffset, progress };
	});

	return (
		<svg
			width={ringSize}
			height={ringSize}
			viewBox={`0 0 ${ringSize} ${ringSize}`}
			className="transform -rotate-90"
			role="img"
			aria-label="Nutrition progress rings"
		>
			<title>Nutrition progress rings</title>
			{rings.map(({ key, radius, circumference, dashOffset, colors }) => (
				<g key={key}>
					<circle
						cx={center}
						cy={center}
						r={radius}
						fill="none"
						stroke={colors.bg}
						strokeWidth={stroke}
					/>
					<circle
						cx={center}
						cy={center}
						r={radius}
						fill="none"
						stroke={colors.stroke}
						strokeWidth={stroke}
						strokeDasharray={circumference}
						strokeDashoffset={dashOffset}
						strokeLinecap="round"
						className="transition-[stroke-dashoffset] duration-500 ease-out"
					/>
				</g>
			))}
		</svg>
	);
}

// === Mini Ring (single nutrient) ===

interface MiniRingProps {
	current: number;
	goal: number;
	color: string;
	bgColor: string;
	size?: number;
}

function MiniRing({ current, goal, color, bgColor, size = 16 }: MiniRingProps) {
	const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
	const stroke = 2;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - progress);
	const center = size / 2;

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="transform -rotate-90"
			aria-hidden="true"
		>
			<circle
				cx={center}
				cy={center}
				r={radius}
				fill="none"
				stroke={bgColor}
				strokeWidth={stroke}
			/>
			<circle
				cx={center}
				cy={center}
				r={radius}
				fill="none"
				stroke={color}
				strokeWidth={stroke}
				strokeDasharray={circumference}
				strokeDashoffset={dashOffset}
				strokeLinecap="round"
			/>
		</svg>
	);
}

// === Micro/Vitamin Pills ===

interface NutrientPillProps {
	label: string;
	current: number;
	goal: number;
	colors: { stroke: string; bg: string };
}

function NutrientPill({ label, current, goal, colors }: NutrientPillProps) {
	const percent = goal > 0 ? Math.round((current / goal) * 100) : 0;

	return (
		<div className="flex items-center gap-1.5 rounded-full bg-stone-800/50 px-2 py-0.5">
			<MiniRing current={current} goal={goal} color={colors.stroke} bgColor={colors.bg} />
			<span className="text-xs text-stone-400">{label}</span>
			<span className="text-xs font-medium" style={{ color: colors.stroke }}>
				{percent}%
			</span>
		</div>
	);
}

// === Main Component ===

export function NutritionRings({
	data,
	size,
	showLabels = false,
	showMicros = false,
}: NutritionRingsProps) {
	const { ring: ringSize, stroke, gap } = SIZES[size];
	const macros = normalizeMacros(data);

	const macroNutrients = useMemo(() => {
		return MACRO_ORDER.map((key) => ({
			key,
			current: macros[key].current,
			goal: macros[key].goal,
			colors: MACRO_COLORS[key],
		}));
	}, [macros]);

	// Extract micros/vitamins if available
	const microData = !isLegacyData(data) ? data.micros : undefined;
	const vitaminData = !isLegacyData(data) ? data.vitamins : undefined;

	return (
		<div className="inline-flex flex-col items-center gap-2">
			{/* Main macro rings */}
			<RingSVG ringSize={ringSize} stroke={stroke} gap={gap} nutrients={macroNutrients} />

			{/* Macro labels */}
			{showLabels && (
				<div className="flex flex-wrap justify-center gap-2 text-xs">
					{macroNutrients.map(({ key, colors, current, goal }) => (
						<div key={key} className="flex items-center gap-1">
							<div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.stroke }} />
							<span className="text-stone-500">{colors.label}</span>
							<span className="text-stone-400">
								{Math.round(current)}/{goal}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Micros row */}
			{showMicros && microData && (
				<div className="flex flex-wrap justify-center gap-1.5">
					{MICRO_ORDER.map((key) => (
						<NutrientPill
							key={key}
							label={MICRO_COLORS[key].label}
							current={microData[key].current}
							goal={microData[key].goal}
							colors={MICRO_COLORS[key]}
						/>
					))}
				</div>
			)}

			{/* Vitamins row */}
			{showMicros && vitaminData && (
				<div className="flex flex-wrap justify-center gap-1.5">
					{VITAMIN_ORDER.map((key) => (
						<NutrientPill
							key={key}
							label={VITAMIN_COLORS[key].label}
							current={vitaminData[key].current}
							goal={vitaminData[key].goal}
							colors={VITAMIN_COLORS[key]}
						/>
					))}
				</div>
			)}
		</div>
	);
}
