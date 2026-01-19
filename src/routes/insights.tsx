import { createFileRoute } from "@tanstack/react-router";
import { InsightsPage } from "@/components/insights/InsightsPage";

export const Route = createFileRoute("/insights")({
	component: InsightsRoute,
});

function InsightsRoute() {
	return <InsightsPage />;
}
