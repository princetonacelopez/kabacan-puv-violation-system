// components/SidebarNav.tsx
"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Calendar,
  Home,
  LogOut,
  Settings,
  Shield,
  Truck,
  User,
  FileWarning,
  FileText,
} from "lucide-react";
import Link from "next/link";

// Menu items
const manageItems = [
  {
    title: "Violations",
    url: "/violations",
    icon: FileWarning,
  },
  {
    title: "Users",
    url: "/users",
    icon: User,
  },
  {
    title: "Vehicle Type",
    url: "/vehicle-types",
    icon: Truck,
  },
  {
    title: "Violation Type",
    url: "/violation-types",
    icon: FileText,
  },
  {
    title: "Audit Logs",
    url: "/audit-logs",
    icon: Calendar,
    adminOnly: true,
  },
  {
    title: "Roles",
    url: "/roles",
    icon: Shield,
    adminOnly: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export default function SidebarNav() {
  const { data: session } = useSession();

  // Determine the home page based on role
  const homePage = session?.user?.role === "ADMIN" ? "/dashboard" : "/violations";

  const items = [
    {
      title: "Dashboard",
      url: homePage, // Dynamic based on role
      icon: Home,
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {manageItems.map((item) =>
                item.adminOnly && session?.user?.role !== "ADMIN" ? null : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}