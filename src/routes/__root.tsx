import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { DebugTimePanel } from "@/components/DebugTimePanel";
import { usePersonFilterStore } from "@/stores/personFilter";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const { filter, setFilter } = usePersonFilterStore();

	return (
		<div className="h-screen flex flex-col bg-stone-950 text-stone-50">
			<AppHeader personFilter={filter} onPersonFilterChange={setFilter} />
			<div className="flex-1 overflow-hidden">
				<Outlet />
			</div>
			{import.meta.env.DEV && <DebugTimePanel />}
		</div>
	);
}
