import { createFileRoute } from "@tanstack/react-router";
import { ModuleView } from "@/components/ModuleView";

export const Route = createFileRoute("/m/$module")({
  component: ModulePage,
});

function ModulePage() {
  const { module } = Route.useParams();
  return <ModuleView slug={module} />;
}
