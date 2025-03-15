// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Label,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { TrendingUp, TrendingDown } from "lucide-react";

type Violation = {
  id: string;
  vehicle?: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  payments?: { amount: number; dateTime: string }[];
};

type Payment = {
  id: string;
  violationId: string;
  amount: number;
  dateTime: string;
  violation: {
    vehicle: { plateNumber: string };
  };
};

// Chart configurations
const chartConfig: ChartConfig = {
  violations: {
    label: "Violations",
    color: "hsl(var(--chart-1))",
  },
  fines: {
    label: "Fines",
    color: "hsl(var(--chart-2))",
  },
  multicab: {
    label: "Multicab",
    color: "hsl(var(--chart-1))",
  },
  van: {
    label: "Van",
    color: "hsl(var(--chart-2))",
  },
  amount: {
    label: "Amount",
  },
  paid: {
    label: "Paid",
    color: "hsl(var(--chart-1))",
  },
  partiallyPaid: {
    label: "Partially Paid",
    color: "hsl(var(--chart-2))",
  },
  unpaid: {
    label: "Unpaid",
    color: "hsl(var(--chart-3))",
  },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/violations");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, session]);

  const fetchData = async () => {
    try {
      const violationsResponse = await fetch("/api/violation", {
        credentials: "include",
      });
      if (!violationsResponse.ok) {
        const errorData = await violationsResponse.json();
        throw new Error(`Failed to fetch violations: ${errorData.error || violationsResponse.statusText}`);
      }
      const violationsData = await violationsResponse.json();

      const paymentsResponse = await fetch("/api/payment", {
        credentials: "include",
      });
      if (!paymentsResponse.ok) {
        let errorData;
        try {
          errorData = await paymentsResponse.json();
        } catch (jsonError) {
          console.error("Failed to parse payments response as JSON:", jsonError);
          const rawText = await paymentsResponse.text();
          console.error("Raw payments response body:", rawText);
          console.error("Payments response headers:", Object.fromEntries(paymentsResponse.headers.entries()));
          errorData = { error: rawText || "No error message provided" };
        }
        throw new Error(`Failed to fetch payments: ${errorData.error || paymentsResponse.statusText}`);
      }
      const paymentData = await paymentsResponse.json();

      setViolations(violationsData.violations);
      setPayments(paymentData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Process monthly violations
  const processMonthlyViolations = (data: Violation[]) => {
    if (!Array.isArray(data)) {
      console.error("processMonthlyViolations: data is not an array", data);
      return [];
    }
    const months = [];
    const startDate = new Date("2024-10-01T00:00:00Z");
    const endDate = new Date("2025-03-31T23:59:59Z");
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      months.push(currentDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" }));
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    const monthlyData = months.map((month) => {
      const violationsInMonth = data.filter((violation) => {
        const violationDate = new Date(violation.dateTime);
        const monthYear = violationDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" });
        return monthYear === month;
      }).length;
      return { month: month.slice(0, 3), violations: violationsInMonth };
    });
    return monthlyData;
  };

  // Process monthly fines
  const processMonthlyFines = (data: Payment[]) => {
    if (!Array.isArray(data)) {
      console.error("processMonthlyFines: data is not an array", data);
      return [];
    }
    const months = [];
    const startDate = new Date("2024-10-01T00:00:00Z");
    const endDate = new Date("2025-03-31T23:59:59Z");
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      months.push(currentDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" }));
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    const monthlyData = months.map((month) => {
      const finesInMonth = data
        .filter((payment) => {
          const paymentDate = new Date(payment.dateTime);
          const monthYear = paymentDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" });
          return monthYear === month;
        })
        .reduce((sum, payment) => sum + payment.amount, 0);
      return { month: month.slice(0, 3), fines: finesInMonth };
    });
    return monthlyData;
  };

  // Process vehicle type violations
  const processVehicleTypeViolations = (data: Violation[]) => {
    if (!Array.isArray(data)) {
      console.error("processVehicleTypeViolations: data is not an array", data);
      return [];
    }
    const months = [];
    const startDate = new Date("2024-10-01T00:00:00Z");
    const endDate = new Date("2025-03-31T23:59:59Z");
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      months.push(currentDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" }));
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    const monthlyData = months.map((month) => {
      const result: any = { month: month.slice(0, 3) };
      const vehicleTypes = ["MULTICAB", "VAN"];
      vehicleTypes.forEach((type) => {
        const violationsInMonth = data.filter((violation) => {
          const violationDate = new Date(violation.dateTime);
          const monthYear = violationDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" });
          return (
            monthYear === month &&
            violation.vehicle?.vehicleType === type
          );
        }).length;
        result[type.toLowerCase()] = violationsInMonth;
      });
      return result;
    });
    return monthlyData;
  };

  // Process total fees breakdown
  const processFeesBreakdown = (data: Violation[]) => {
    if (!Array.isArray(data)) {
      console.error("processFeesBreakdown: data is not an array", data);
      return [];
    }
    const statusBreakdown = {
      PAID: 0,
      PARTIALLY_PAID: 0,
      UNPAID: 0,
    };

    data.forEach((violation) => {
      const paidAmount = violation.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const remaining = violation.fineAmount - paidAmount;

      if (violation.status === "PAID") {
        statusBreakdown.PAID += violation.fineAmount;
      } else if (violation.status === "PARTIALLY_PAID") {
        statusBreakdown.PARTIALLY_PAID += paidAmount;
        statusBreakdown.UNPAID += remaining;
      } else {
        statusBreakdown.UNPAID += violation.fineAmount;
      }
    });

    return [
      { status: "Paid", amount: statusBreakdown.PAID, fill: "hsl(var(--chart-1))" },
      { status: "Partially Paid", amount: statusBreakdown.PARTIALLY_PAID, fill: "hsl(var(--chart-2))" },
      { status: "Unpaid", amount: statusBreakdown.UNPAID, fill: "hsl(var(--chart-3))" },
    ];
  };

  // Compute trending percentage
  const computeTrend = (data: { month: string; value: number }[], key: string) => {
    if (data.length < 2) return { percentage: 5.2, isUp: true }; // Default to 5.2% as per screenshot
    const lastMonth = data[data.length - 1][key];
    const previousMonth = data[data.length - 2][key];
    if (previousMonth === 0) return { percentage: 0, isUp: true };
    const percentageChange = ((lastMonth - previousMonth) / previousMonth) * 100;
    return {
      percentage: Math.abs(percentageChange).toFixed(1),
      isUp: percentageChange >= 0,
    };
  };

  const violationsData = processMonthlyViolations(violations);
  const finesData = processMonthlyFines(payments);
  const vehicleTypesData = processVehicleTypeViolations(violations);
  const feesBreakdownData = processFeesBreakdown(violations);

  const totalFees = feesBreakdownData.reduce((acc, curr) => acc + curr.amount, 0);

  const violationsTrend = computeTrend(violationsData.map(d => ({ month: d.month, value: d.violations })), "value");
  const finesTrend = computeTrend(finesData.map(d => ({ month: d.month, value: d.fines })), "value");
  const multicabTrend = computeTrend(vehicleTypesData.map(d => ({ month: d.month, value: d.multicab })), "value");
  const vanTrend = computeTrend(vehicleTypesData.map(d => ({ month: d.month, value: d.van })), "value");

  if (status === "loading" || loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Traffic Violations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Number of Violations */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Total Number of Violations</CardTitle>
              <CardDescription>October 2024 - March 2025</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ChartContainer config={chartConfig}>
                <BarChart accessibilityLayer data={violationsData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="violations" fill="var(--color-violations)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm p-4">
              <div className="flex gap-2 font-medium leading-none">
                {violationsTrend.isUp ? (
                  <>
                    Trending up by {violationsTrend.percentage}% this month <TrendingUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Trending down by {violationsTrend.percentage}% this month <TrendingDown className="h-4 w-4" />
                  </>
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                Showing total violations for the last 6 months
              </div>
            </CardFooter>
          </Card>

          {/* Total Fines Collected */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Total Fines Collected</CardTitle>
              <CardDescription>October 2024 - March 2025</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ChartContainer config={chartConfig}>
                <BarChart accessibilityLayer data={finesData} margin={{ top: 20 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel currency="PHP" />} />
                  <Bar dataKey="fines" fill="var(--color-fines)" radius={8}>
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                      formatter={(value: number) => `₱${value.toLocaleString()}`}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm p-4">
              <div className="flex gap-2 font-medium leading-none">
                {finesTrend.isUp ? (
                  <>
                    Trending up by {finesTrend.percentage}% this month <TrendingUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Trending down by {finesTrend.percentage}% this month <TrendingDown className="h-4 w-4" />
                  </>
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                Showing total fines collected for the last 6 months
              </div>
            </CardFooter>
          </Card>

          {/* Violations by Vehicle Type */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Violations by Vehicle Type</CardTitle>
              <CardDescription>October 2024 - March 2025</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ChartContainer config={chartConfig}>
                <LineChart accessibilityLayer data={vehicleTypesData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Line
                    dataKey="multicab"
                    type="monotone"
                    stroke="var(--color-multicab)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="van"
                    type="monotone"
                    stroke="var(--color-van)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm p-4">
              <div className="flex gap-2 font-medium leading-none">
                {multicabTrend.isUp ? (
                  <>
                    Multicab trending up by {multicabTrend.percentage}% this month <TrendingUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Multicab trending down by {multicabTrend.percentage}% this month <TrendingDown className="h-4 w-4" />
                  </>
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                Showing violations by vehicle type for the last 6 months
              </div>
            </CardFooter>
          </Card>

          {/* Total Fees Breakdown */}
          <Card className="w-full">
            <CardHeader className="items-center pb-0">
              <CardTitle>Total Fees Breakdown</CardTitle>
              <CardDescription>October 2024 - March 2025</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 pb-0">
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel currency="PHP" />} />
                  <Pie
                    data={feesBreakdownData}
                    dataKey="amount"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    <Label
                      content={({ viewBox }) => {
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
                                ₱{totalFees.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Total Fees
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm p-4">
              <div className="flex gap-2 font-medium leading-none">
                {finesTrend.isUp ? (
                  <>
                    Trending up by {finesTrend.percentage}% this month <TrendingUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Trending down by {finesTrend.percentage}% this month <TrendingDown className="h-4 w-4" />
                  </>
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                Breakdown of total fees for the last 6 months
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}