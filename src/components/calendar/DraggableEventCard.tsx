import { useDraggable } from "@dnd-kit/core";
import type { KitchenEvent } from "@/lib/mockKitchenEvents";
import { cn } from "@/lib/utils";
import { KitchenEventCard } from "./KitchenEventCard";

interface DraggableEventCardProps {
	event: KitchenEvent;
	isDragging: boolean;
	isBeingDragged: boolean;
	previewTime: number | null;
	isBlocked: boolean;
	/** Disable drag for this card (e.g., past events) */
	disabled?: boolean;
	onClick?: () => void;
	onPin?: () => void;
	onConfirm?: () => void;
	onUndoDone?: () => void;
	onDislike?: (e: React.MouseEvent) => void;
	highlighted?: boolean;
	/** Color class for the timeline dot (e.g., "bg-sage-500") */
	dotColorClass?: string;
	/** Current time for status calculation (supports debug time override) */
	now?: number;
}

export function DraggableEventCard({
	event,
	isDragging: _isDragging,
	isBeingDragged,
	previewTime,
	isBlocked: _isBlocked,
	disabled = false,
	onClick,
	onPin,
	onConfirm,
	onUndoDone,
	onDislike,
	highlighted,
	dotColorClass,
	now,
}: DraggableEventCardProps) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: event.id,
		data: { event },
		disabled,
	});

	// When using DragOverlay, the original card stays in place but is hidden
	// Use isBeingDragged (controlled by parent) instead of dnd-kit's isDragging
	// to sync visibility with our delayed DragOverlay appearance
	return (
		<div
			ref={setNodeRef}
			data-draggable-event-id={event.id}
			style={{
				WebkitTapHighlightColor: "transparent",
				WebkitTouchCallout: "none",
			}}
			className={cn(
				"relative touch-none select-none",
				// Hide original when DragOverlay is showing (controlled by parent state)
				isBeingDragged && "opacity-0",
			)}
			{...listeners}
			{...attributes}
		>
			{/* Timeline dot - positioned with negative margin to sit on the track */}
			{dotColorClass && (
				<div className="absolute -left-5 top-5 flex h-2.5 w-2.5 items-center justify-center">
					<div className={cn("h-2 w-2 rounded-full transition-colors", dotColorClass)} />
				</div>
			)}
			<KitchenEventCard
				event={event}
				onClick={onClick}
				onPin={onPin}
				onConfirm={onConfirm}
				onUndoDone={onUndoDone}
				onDislike={onDislike}
				highlighted={highlighted}
				previewTime={previewTime}
				now={now}
			/>
		</div>
	);
}
