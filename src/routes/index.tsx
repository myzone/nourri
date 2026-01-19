import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTimeline } from "@/components/calendar/UnifiedTimeline";

export const Route = createFileRoute("/")({
	component: SchedulePage,
});

function SchedulePage() {
	return <UnifiedTimeline />;
}
