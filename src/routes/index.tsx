import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<main className="flex min-h-screen items-center justify-center">
			<h1 className="text-4xl font-bold">Nourri</h1>
		</main>
	);
}
