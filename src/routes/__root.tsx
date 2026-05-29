import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <button
        onClick={() => { router.invalidate(); reset(); }}
        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MedaCare HMS — Hospital & ERP" },
      { name: "description", content: "Bilingual hospital management & ERP platform with 17 modules." },
      { property: "og:title", content: "MedaCare HMS — Hospital & ERP" },
      { name: "twitter:title", content: "MedaCare HMS — Hospital & ERP" },
      { property: "og:description", content: "Bilingual hospital management & ERP platform with 17 modules." },
      { name: "twitter:description", content: "Bilingual hospital management & ERP platform with 17 modules." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76b9310f-be00-4ebf-9300-75814420a004/id-preview-7a1f4672--77ef716c-6aa9-469c-9170-38f769e2ea3a.lovable.app-1780024621698.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76b9310f-be00-4ebf-9300-75814420a004/id-preview-7a1f4672--77ef716c-6aa9-469c-9170-38f769e2ea3a.lovable.app-1780024621698.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background text-foreground">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 min-w-0">
                <Outlet />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
