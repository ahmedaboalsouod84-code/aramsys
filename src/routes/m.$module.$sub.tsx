import { createFileRoute } from "@tanstack/react-router";
import { SubPageView } from "@/components/ModuleView";

export const Route = createFileRoute("/m/$module/$sub")({
  component: SubPage,
});

function SubPage() {
  const { module, sub } = Route.useParams();
  return <SubPageView moduleSlug={module} subSlug={sub} />;
}
