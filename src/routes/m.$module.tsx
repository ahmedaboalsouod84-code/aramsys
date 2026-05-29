import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/m/$module")({
  component: () => <Outlet />,
});
