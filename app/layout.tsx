// app/layout.tsx
"use client";

import { Toaster } from "sonner";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import SidebarNav from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <SessionProviderWrapper>
          <SidebarProvider>
            {pathname !== "/auth/signin" && <SidebarNav />}
            <main
              className={cn(
                "flex-1 p-4 bg-gray-100 min-h-screen",
                pathname !== "/auth/signin" ? "ml-0" : ""
              )}
            >
              {children}
            </main>
            <Toaster />
          </SidebarProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}