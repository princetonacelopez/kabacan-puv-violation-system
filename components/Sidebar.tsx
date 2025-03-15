// components/Sidebar.tsx
"use client";

import * as React from "react";
import { BarChart, File, FileText, Inbox, Key, Shield, Bus, UserCog } from "lucide-react"; // Replaced Truck with Bus
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import ViolationSearch from "@/components/ViolationSearch";
import { Command } from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useViolations } from "@/app/contexts/ViolationsContext";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Violation = {
  id: string;
  vehicle: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  payments?: { amount: number; dateTime: string }[];
};

type GroupedViolation = {
  plateNumber: string;
  vehicleType: string;
  violations: Violation[];
};

// Sidebar menu data
const sidebarData = {
  user: {
    name: "Admin User",
    email: "admin@example.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: BarChart,
      isActive: false,
    },
  ],
  manageMenu: [
    {
      title: "Vehicles",
      url: "/vehicles",
      icon: Inbox,
      isActive: false,
    },
    {
      title: "Users",
      url: "/users",
      icon: UserCog,
      isActive: false,
    },
    {
      title: "Vehicle Types",
      url: "/vehicle-types",
      icon: Bus, // Using Bus as a placeholder for vehicle types
      isActive: false,
    },
    {
      title: "Violation Types",
      url: "/violation-types",
      icon: File,
      isActive: false,
    },
    {
      title: "Roles",
      url: "/roles",
      icon: Key,
      isActive: false,
    },
    {
      title: "Audits",
      url: "/audits",
      icon: FileText,
      isActive: false,
    },
  ],
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
};

export function SidebarComponent({
  page,
  setShowCreateForm,
  setShowImportDialog,
}: {
  page: string;
  setShowCreateForm: (value: boolean) => void;
  setShowImportDialog: (value: boolean) => void;
}) {
  const { setOpen, isOpen } = useSidebar();
  const router = useRouter();
  const { data: session } = useSession();
  const { violations, setViewViolations, searchPlateNumber, setSearchPlateNumber } = useViolations();

  console.log("SidebarComponent violations:", violations);

  // Set active item based on the current page
  const [activeItem, setActiveItem] = React.useState(
    sidebarData.navMain.concat(sidebarData.manageMenu).find((item) => item.url === `/${page}`) || sidebarData.navMain[0]
  );

  // Group violations by plate number and filter by search
  const groupedViolations: { [key: string]: GroupedViolation } = Array.isArray(violations)
    ? violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
        const plateNumber = v.vehicle?.plateNumber || "N/A";
        if (!acc[plateNumber] && (!searchPlateNumber || plateNumber.toLowerCase().includes(searchPlateNumber.toLowerCase()))) {
          acc[plateNumber] = {
            plateNumber,
            vehicleType: v.vehicle?.vehicleType || "N/A",
            violations: [],
          };
        }
        if (!searchPlateNumber || plateNumber.toLowerCase().includes(searchPlateNumber.toLowerCase())) {
          acc[plateNumber].violations.push(v);
        }
        return acc;
      }, {})
    : {};

  // Sort by most recent violation date
  const violationItems: GroupedViolation[] = Object.values(groupedViolations).sort((a, b) => {
    const latestA = a.violations.length > 0 ? new Date(a.violations[0].dateTime) : new Date(0);
    const latestB = b.violations.length > 0 ? new Date(b.violations[0].dateTime) : new Date(0);
    return latestB.getTime() - latestA.getTime();
  });

  // Update user data based on session
  const user = session?.user
    ? {
        name: session.user.name || "Admin User",
        email: session.user.email || "admin@example.com",
        avatar: session.user.image || "/avatars/admin.jpg",
      }
    : sidebarData.user;

  console.log("Rendering SidebarComponent:", { violationsLength: violations?.length || 0, violationItems });

  const handleMenuClick = (item: { title: string; url: string }) => {
    console.log(`Menu item clicked: ${item.title}, navigating to ${item.url}`);
    setActiveItem(item);
    setOpen(true);
    router.push(item.url);
  };

  const getVehicleStatus = (violations: Violation[]) => {
    const allPaid = violations.every((v) => v.status === "PAID");
    const hasUnpaid = violations.some((v) => v.status === "UNPAID");
    if (allPaid) return "PAID";
    if (hasUnpaid) return "UNPAID";
    return "PARTIALLY_PAID";
  };

  if (page === "vehicles") {
    return (
      <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
        <Sidebar collapsible="none" className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                  <a href="#">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Command className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Traffic System</span>
                      <span className="truncate text-xs">Enterprise</span>
                    </div>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu>
                  {sidebarData.navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        onClick={() => handleMenuClick(item)}
                        isActive={activeItem?.title === item.title}
                        className="px-2.5 md:px-2"
                      >
                        <item.icon />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu>
                  {sidebarData.manageMenu.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        onClick={() => handleMenuClick(item)}
                        isActive={activeItem?.title === item.title}
                        className="px-2.5 md:px-2"
                      >
                        <item.icon />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <NavUser user={user} />
          </SidebarFooter>
        </Sidebar>
        <Sidebar collapsible="none" className="hidden flex-1 md:flex">
          <SidebarHeader className="gap-3.5 border-b p-4">
            <div className="flex w-full items-center justify-between">
              <div className="text-base font-medium text-foreground">Vehicles</div>
              {session?.user?.role === "ADMIN" && (
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <ViolationSearch
              searchPlateNumber={searchPlateNumber}
              setSearchPlateNumber={setSearchPlateNumber}
            />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="px-0">
              <SidebarGroupContent>
                {violationItems.length > 0 ? (
                  violationItems.map((group: GroupedViolation) => {
                    const totalFine = group.violations.reduce((sum, v) => sum + v.fineAmount, 0);
                    const paidAmount = group.violations
                      .flatMap((v) => v.payments || [])
                      .reduce((sum, p) => sum + p.amount, 0);
                    const remainingBalance = totalFine - paidAmount;
                    const status = getVehicleStatus(group.violations);
                    return (
                      <a
                        href="#"
                        key={group.plateNumber}
                        className="flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        onClick={() => setViewViolations(group)}
                      >
                        <div className="flex w-full items-center gap-2">
                          {group.vehicleType === "MULTICAB" ? (
                            <Bus className="h-4 w-4 text-muted-foreground" /> // Correct icon for Multicab
                          ) : (
                            <Car className="h-4 w-4 text-muted-foreground" /> // Truck for VAN
                          )}
                          <span>{group.plateNumber}</span>
                          <span className="ml-auto text-xs">
                            {group.violations.length > 0
                              ? formatDate(group.violations[0].dateTime)
                              : "N/A"}
                          </span>
                        </div>
                        <span className="line-clamp-2 w-[260px] whitespace-break-spaces text-xs">
                          {`${group.violations.length} violation(s), Remaining Balance: ₱${remainingBalance.toFixed(
                            0
                          )}`}
                        </span>
                        <Badge
                          variant={
                            status === "PAID"
                              ? "success"
                              : status === "UNPAID"
                              ? "destructive"
                              : "default" // Yellow for PARTIALLY_PAID
                          }
                        >
                          {status}
                        </Badge>
                      </a>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">No vehicles found</div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </Sidebar>
    );
  } else {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Traffic System</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {sidebarData.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => handleMenuClick(item)}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {sidebarData.manageMenu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => handleMenuClick(item)}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
    );
  }
}

export default SidebarComponent;