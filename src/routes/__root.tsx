import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts, useNavigate,
} from "@tanstack/react-router";


import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/sonner";

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
      { title: "Durrat Aram Dental Clinics" },
      { name: "description", content: "Bilingual practice management system for Durrat Aram Dental Clinics." },
      { property: "og:title", content: "Durrat Aram Dental Clinics" },
      { name: "twitter:title", content: "Durrat Aram Dental Clinics" },
      { property: "og:description", content: "Bilingual practice management system for Durrat Aram Dental Clinics." },
      { name: "twitter:description", content: "Bilingual practice management system for Durrat Aram Dental Clinics." },
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
        <AuthProvider>
          <AuthedShell />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function AuthedShell() {
  const { user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const path = router.state.location.pathname;

  useEffect(() => {
    if (!user && path !== "/login") navigate({ to: "/login" });
  }, [user, path, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <Outlet />
      </div>
    );
  }



  return (
    <SidebarProvider>
      <ResponsiveShell />
    </SidebarProvider>
  );
}

function ResponsiveShell() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-[100dvh] w-full bg-background text-foreground">
        <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

