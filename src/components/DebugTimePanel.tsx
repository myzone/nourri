import { useCallback, useEffect, useState } from "react";
import { useDebugTimeStore } from "@/stores/debugTime";

export function DebugTimePanel() {
	const { overrideTime, setOverrideTime, getNow } = useDebugTimeStore();
	const [isOpen, setIsOpen] = useState(false);
	const [, forceUpdate] = useState(0);

	// Force re-render every second to show ticking time
	useEffect(() => {
		if (!isOpen) return;
		const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
		return () => clearInterval(interval);
	}, [isOpen]);

	const currentTime = getNow();
	const isOverridden = overrideTime !== null;

	const handleTimeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const [hours, minutes] = e.target.value.split(":").map(Number);
			if (hours === undefined || minutes === undefined) return;

			const now = new Date();
			now.setHours(hours, minutes, 0, 0);
			setOverrideTime(now.getTime());
		},
		[setOverrideTime],
	);

	const handleReset = useCallback(() => {
		setOverrideTime(null);
	}, [setOverrideTime]);

	const handleOffset = useCallback(
		(minutes: number) => {
			const base = overrideTime ?? Date.now();
			setOverrideTime(base + minutes * 60 * 1000);
		},
		[overrideTime, setOverrideTime],
	);

	const formatTime = (ts: number) => {
		return new Date(ts).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	};

	const formatTimeInput = (ts: number) => {
		const d = new Date(ts);
		return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	};

	if (!isOpen) {
		return (
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="fixed bottom-4 right-4 z-50 rounded-full bg-stone-800 p-2 text-xs text-stone-400 shadow-lg hover:bg-stone-700"
				title="Debug Time"
			>
				{isOverridden ? (
					<span className="text-amber-400">{formatTime(currentTime)}</span>
				) : (
					<span>🕐</span>
				)}
			</button>
		);
	}

	return (
		<div className="fixed bottom-4 right-4 z-50 w-64 rounded-lg bg-stone-800 p-3 shadow-xl border border-stone-700">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-stone-300">Debug Time</span>
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					className="text-stone-500 hover:text-stone-300"
				>
					✕
				</button>
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<span className="text-xs text-stone-500">Now:</span>
					<span
						className={`text-sm font-mono ${isOverridden ? "text-amber-400" : "text-stone-200"}`}
					>
						{formatTime(currentTime)}
					</span>
					{isOverridden && <span className="text-[10px] text-amber-500">(override)</span>}
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs text-stone-500">Set:</span>
					<input
						type="time"
						value={formatTimeInput(currentTime)}
						onChange={handleTimeChange}
						className="flex-1 rounded bg-stone-900 px-2 py-1 text-sm text-stone-200 border border-stone-700 focus:border-stone-500 focus:outline-none"
					/>
				</div>

				<div className="flex gap-1">
					<button
						type="button"
						onClick={() => handleOffset(-60)}
						className="flex-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
					>
						-1h
					</button>
					<button
						type="button"
						onClick={() => handleOffset(-15)}
						className="flex-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
					>
						-15m
					</button>
					<button
						type="button"
						onClick={() => handleOffset(15)}
						className="flex-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
					>
						+15m
					</button>
					<button
						type="button"
						onClick={() => handleOffset(60)}
						className="flex-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
					>
						+1h
					</button>
				</div>

				{isOverridden && (
					<button
						type="button"
						onClick={handleReset}
						className="w-full rounded bg-stone-900 px-2 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
					>
						Reset to real time
					</button>
				)}
			</div>
		</div>
	);
}
