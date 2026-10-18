import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AppHeader } from "@/components/layout/app-header";
import { QuickAddUrlListener } from "@/components/features/quick-add-url-listener";
import { ToastContextProvider } from "@/components/ui/toast";
import { PwaProvider } from "@/components/pwa-provider";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <ToastContextProvider>
      <PwaProvider>
        <div className="bg-background text-foreground flex min-h-screen">
          {/* Skip to Content bypass link for keyboard accessibility */}
          <a
            href="#main-content"
            className="focus:bg-primary focus:text-primary-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:font-medium focus:shadow-lg focus:ring-2 focus:outline-none"
          >
            Skip to main content
          </a>

          {/* Desktop Sidebar (w-64, hidden on mobile) */}
          <Sidebar user={user} />

          {/* Main Content Area */}
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader user={user} />
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col p-4 pb-24 outline-none sm:p-6 md:pb-8 lg:p-8"
            >
              {children}
            </main>
          </div>

          {/* Mobile Bottom Tab Bar (hidden on md+) */}
          <BottomNav />

          {/* Global Quick Add listener for ?action=new */}
          <QuickAddUrlListener />
        </div>
      </PwaProvider>
    </ToastContextProvider>
  );
}
