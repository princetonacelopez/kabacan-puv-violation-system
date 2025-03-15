// components/app-sidebar.tsx
"use client";

import * as React from "react";
import { ArchiveX, Command, File, Inbox, Send, Trash2 } from "lucide-react";
import { NavUser } from "@/components/nav-user";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

export function AppSidebar({ data }: { data: any }) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
  const [violations, setViolations] = React.useState<GroupedViolation[]>([]);
  const { setOpen } = useSidebar();

  // Sample data for violations (replace with actual data fetching if needed)
  const groupedViolations = violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
    const plateNumber = v.vehicle?.plateNumber || "N/A";
    if (!acc[plateNumber]) {
      acc[plateNumber] = {
        plateNumber,
        vehicleType: v.vehicle?.vehicleType || "N/A",
        violations: [],
      };
    }
    acc[plateNumber].violations.push(v);
    return acc;
  }, {});

  const violationItems = Object.values(groupedViolations).slice(0, 5); // Show up to 5 items in sidebar

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
    >
      {/* First Sidebar (Icons) */}
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
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
                {data.navMain.map((item: any) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item);
                        router.push(item.url);
                        setOpen(true);
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {/* Second Sidebar (Content) */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-base font-medium text-foreground">
              {activeItem?.title}
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label>
          </div>
          <SidebarInput placeholder="Type to search..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {violationItems.map((group: GroupedViolation) => (
                <a
                  href="#"
                  key={group.plateNumber}
                  className="flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => setViewViolations(group)}
                >
                  <div className="flex w-full items-center gap-2">
                    <span>{group.plateNumber}</span>
                    <span className="ml-auto text-xs">{group.violations[0]?.dateTime.split("T")[0]}</span>
                  </div>
                  <span className="font-medium">{group.vehicleType}</span>
                  <span className="line-clamp-2 w-[260px] whitespace-break-spaces text-xs">
                    {`${group.violations.length} violation(s), Total Fine: ₱${group.violations.reduce((sum, v) => sum + v.fineAmount, 0)}`}
                  </span>
                </a>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}