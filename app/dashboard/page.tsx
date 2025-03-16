// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, AreaChart, Area, Label } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

type Violation = {
  id: string;
  vehicle: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  payments?: { amount: number }[];
};

type GroupedViolation = {
  plateNumber: string;
  vehicleType: string;
  violations: Violation[];
};

type PaginatedResponse = {
  vehicles: { plateNumber: string; vehicleType: string; violations: Violation[] }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Chart configuration
const chartConfig = {
  violations: {
    label: "Violations",
    color: "hsl(var(--chart-1))",
  },
  unpaid: {
    label: "Unpaid",
    color: "hsl(var(--chart-2))",
  },
  partiallypaid: {
    label: "Partially Paid",
    color: "hsl(var(--chart-3))",
  },
  paid: {
    label: "Paid",
    color: "hsl(var(--chart-1))",
  },
  multicab: {
    label: "Multicab",
    color: "hsl(var(--chart-1))",
  },
  van: {
    label: "Van",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<GroupedViolation[]>([]);
  const [chartData, setChartData] = useState<{ month: string; violations: number }[]>([]);
  const [finesBreakdownData, setFinesBreakdownData] = useState<
    { status: string; amount: number }[]
  >([]);
  const [vehicleTypeData, setVehicleTypeData] = useState<
    { month: string; multicab: number; van: number }[]
  >([]);
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && !vehicles.length) {
      fetchAllVehicles().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [status, router, vehicles.length]);

  useEffect(() => {
    if (vehicles.length > 0) {
      updateChartData();
      updateFinesBreakdown();
      updateVehicleTypeData();
      updateAllViolations();
    }
  }, [vehicles]);

  const fetchAllVehicles = async () => {
    try {
      console.log("Fetching vehicles with session:", session);
      const response = await fetch(`/api/vehicle?page=1&limit=1000`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch vehicles");
      }
      const data: PaginatedResponse = await response.json();
      console.log("Raw API response:", data);

      const groupedViolations: GroupedViolation[] = data.vehicles
        .filter((vehicle) => vehicle.violations && vehicle.violations.length > 0)
        .map((vehicle) => ({
          plateNumber: vehicle.plateNumber,
          vehicleType: vehicle.vehicleType,
          violations: vehicle.violations.map((violation) => ({
            ...violation,
            vehicle: {
              plateNumber: vehicle.plateNumber,
              vehicleType: vehicle.vehicleType,
            },
          })),
        }));
      console.log("Transformed groupedViolations:", groupedViolations);

      setVehicles(groupedViolations);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch vehicles");
      setVehicles([]);
    }
  };

  const updateChartData = () => {
    const flatViolations = vehicles.flatMap((group) => group.violations);
    const endDate = new Date("2025-03-16");
    const startDate = startOfMonth(subMonths(endDate, 5));

    const filteredViolations = flatViolations.filter((violation) => {
      const violationDate = new Date(violation.dateTime);
      return violationDate >= startDate && violationDate <= endDate;
    });

    const monthMap: { [key: string]: number } = {};
    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(new Date("2025-03-16"), i);
      const monthKey = format(monthDate, "yyyy-MM");
      monthMap[monthKey] = 0;
    }

    filteredViolations.forEach((violation) => {
      const monthKey = format(new Date(violation.dateTime), "yyyy-MM");
      if (monthMap[monthKey] !== undefined) {
        monthMap[monthKey] += 1;
      }
    });

    const chartData = Object.entries(monthMap)
      .map(([month, violations]) => ({
        month: format(new Date(month), "MMMM"),
        violations,
      }))
      .sort((a, b) => {
        const monthOrder = ["October", "November", "December", "January", "February", "March"];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    setChartData(chartData);
  };

  const updateFinesBreakdown = () => {
    const flatViolations = vehicles.flatMap((group) => group.violations);
    console.log("Flat violations for fines breakdown:", flatViolations);

    const statusMap: { [key: string]: number } = {
      unpaid: 0,
      partiallypaid: 0,
      paid: 0,
    };

    flatViolations.forEach((violation) => {
      console.log("Processing violation for fines:", violation);
      const paidAmount = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      console.log("Paid amount:", paidAmount, "Fine amount:", violation.fineAmount);
      const remaining = violation.fineAmount - paidAmount;
      console.log("Remaining:", remaining);
      if (remaining === 0) {
        statusMap.paid += violation.fineAmount;
      } else if (paidAmount === 0) {
        statusMap.unpaid += violation.fineAmount;
      } else {
        statusMap.partiallypaid += violation.fineAmount;
      }
    });

    const finesData = Object.entries(statusMap)
      .map(([status, amount]) => ({
        status,
        amount,
      }))
      .filter((entry) => entry.amount > 0);
    console.log("Fines breakdown data:", finesData);
    console.log("Total fines calculated:", totalFines);

    if (finesData.length === 0) {
      console.warn("No valid fines data to display in breakdown chart");
    }

    setFinesBreakdownData(finesData);
  };

  const updateVehicleTypeData = () => {
    const flatViolations = vehicles.flatMap((group) => group.violations);
    const endDate = new Date("2025-03-16");
    const startDate = startOfMonth(subMonths(endDate, 5));

    const filteredViolations = flatViolations.filter((violation) => {
      const violationDate = new Date(violation.dateTime);
      return violationDate >= startDate && violationDate <= endDate;
    });

    const monthVehicleMap: { [key: string]: { multicab: number; van: number } } = {};
    filteredViolations.forEach((violation) => {
      const monthKey = format(new Date(violation.dateTime), "yyyy-MM");
      if (!monthVehicleMap[monthKey]) {
        monthVehicleMap[monthKey] = { multicab: 0, van: 0 };
      }
      if (violation.vehicle.vehicleType === "MULTICAB") {
        monthVehicleMap[monthKey].multicab += 1;
      } else if (violation.vehicle.vehicleType === "VAN") {
        monthVehicleMap[monthKey].van += 1;
      }
    });

    const vehicleData = Object.entries(monthVehicleMap)
      .map(([month, counts]) => ({
        month: format(new Date(month), "MMMM"),
        multicab: counts.multicab,
        van: counts.van,
      }))
      .sort((a, b) => {
        const monthOrder = ["October", "November", "December", "January", "February", "March"];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    setVehicleTypeData(vehicleData);
  };

  const updateAllViolations = () => {
    const flatViolations = vehicles.flatMap((group) => group.violations);
    const sortedViolations = flatViolations.sort((a, b) => {
      return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
    });
    setAllViolations(sortedViolations);
  };

  const totalFines = finesBreakdownData.reduce((sum, d) => sum + d.amount, 0);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 overflow-x-hidden max-w-full">
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="w-full max-w-full flex-1">
            <CardHeader>
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[200px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[150px] w-full" />
            </CardContent>
          </Card>
          <Card className="w-full max-w-full flex-1">
            <CardHeader>
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[200px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[150px] w-full" />
            </CardContent>
          </Card>
          <Card className="w-full max-w-full flex-1">
            <CardHeader>
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[200px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[150px] w-full" />
            </CardContent>
          </Card>
        </div>
        <Card className="w-full max-w-full">
          <CardHeader>
            <Skeleton className="h-4 w-[150px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!session) {
    return <div>Session not available</div>;
  }

  return (
    <SidebarInset>
      <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background p-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 overflow-x-hidden max-w-full">
        <h2 className="text-2xl font-bold">Dashboard</h2>

        {/* Charts in 1 row, 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Violation Trends (Last 6 Months) */}
          <Card className="w-full max-w-full flex-1">
            <CardHeader>
              <CardTitle>Vehicle Violations</CardTitle>
              <CardDescription>October 2024 - March 2025</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={chartConfig} className="h-auto w-full max-w-full min-h-[150px]">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="violations"
                    fill="var(--color-violations)"
                    radius={8}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Total Fines Breakdown */}
          <Card className="w-full max-w-full flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>Total Fines Breakdown</CardTitle>
              <CardDescription>October 2024 - March 2025</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square w-full max-w-full min-h-[150px]"
              >
                {finesBreakdownData.length > 0 ? (
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={finesBreakdownData}
                      dataKey="amount"
                      nameKey="status"
                      innerRadius={60}
                      outerRadius={80}
                      strokeWidth={5}
                    >
                      {finesBreakdownData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartConfig[entry.status.toLowerCase()]?.color || "gray"}
                        />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          console.log("ViewBox for pie chart:", viewBox); // Debug viewBox
                          console.log("Total Fines to display:", totalFines); // Debug totalFines
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  ₱{totalFines.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-muted-foreground"
                                >
                                  Total Fines
                                </tspan>
                              </text>
                            );
                          }
                          console.warn("ViewBox missing cx or cy, cannot render label");
                          return null; // Return null if viewBox is invalid
                        }}
                      />
                    </Pie>
                  </PieChart>
                ) : (
                  <div className="text-center text-muted-foreground">
                    No fines data available
                  </div>
                )}
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Violations by Vehicle Type */}
          <Card className="w-full max-w-full flex-1">
            <CardHeader>
              <CardTitle>Violations by Vehicle Type</CardTitle>
              <CardDescription>Showing vehicle type violation for the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={chartConfig} className="h-auto w-full max-w-full min-h-[150px]">
                <AreaChart
                  accessibilityLayer
                  data={vehicleTypeData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    dataKey="multicab"
                    type="natural"
                    fill="var(--color-multicab)"
                    fillOpacity={0.4}
                    stroke="var(--color-multicab)"
                    stackId="a"
                  />
                  <Area
                    dataKey="van"
                    type="natural"
                    fill="var(--color-van)"
                    fillOpacity={0.4}
                    stroke="var(--color-van)"
                    stackId="a"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* All Violations Table (Sorted Latest to Oldest) */}
        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle>Latest Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Vehicle Type</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Fine Amount</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allViolations.length > 0 ? (
                  allViolations.map((violation) => {
                    const paidAmount = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                    const remaining = violation.fineAmount - paidAmount;
                    return (
                      <TableRow key={violation.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(violation.dateTime), "MMMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{violation.vehicle.plateNumber}</TableCell>
                        <TableCell>{violation.vehicle.vehicleType}</TableCell>
                        <TableCell>{violation.violationType}</TableCell>
                        <TableCell>₱{violation.fineAmount.toFixed(0)}</TableCell>
                        <TableCell>₱{remaining.toFixed(0)}</TableCell>
                        <TableCell>{violation.status}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No violations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}