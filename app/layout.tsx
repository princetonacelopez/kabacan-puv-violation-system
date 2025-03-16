// app/layout.tsx
"use client";
import "./globals.css";
import { Toaster } from "sonner";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { SidebarComponent } from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ViolationsProvider } from "./contexts/ViolationsContext";

// Child component to handle SidebarInset with useSidebar
function LayoutContent({ children, page, showSidebar }: { children: React.ReactNode; page: string; showSidebar: boolean }) {
  const { isOpen } = useSidebar();

  if (!showSidebar) {
    return <>{children}</>; // Render children without SidebarInset if no sidebar
  }

  return (
    <SidebarInset
      className="transition-all duration-300 ease-in-out"
      style={{
        width: `calc(100% - ${isOpen ? "calc(var(--sidebar-width-icon) + var(--sidebar-width-expanded))" : "var(--sidebar-width-icon)"})`,
      }}
    >
      {children}
    </SidebarInset>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const page = pathname?.replace("/", "") || "dashboard";
  const showSidebar = pathname !== "/auth/signin"; // Hide sidebar on sign-in page

  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-gray-100", pathname === "/" && "flex flex-col")}>
        <SessionProviderWrapper>
          <SidebarProvider
            style={
              page === "vehicles"
                ? {
                    "--sidebar-width": "350px",
                  } as React.CSSProperties
                : undefined
            }
          >
            <ViolationsProvider>
              {showSidebar && <SidebarComponent page={page} />}
              <LayoutContent page={page} showSidebar={showSidebar}>
                {children}
              </LayoutContent>
            </ViolationsProvider>
          </SidebarProvider>
        </SessionProviderWrapper>

        <Toaster />
      </body>
    </html>
  );
}