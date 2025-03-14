// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// Chart configurations
const violationChartConfig: ChartConfig = {
  violations: {
    label: "Violations",
    color: "hsl(var(--chart-1))",
  },
};

const finesChartConfig: ChartConfig = {
  fines: {
    label: "Fines",
    color: "hsl(var(--chart-2))",
  },
};

const vehicleTypeChartConfig: ChartConfig = {
  multicab: {
    label: "Multicab",
    color: "hsl(var(--chart-1))",
  },
  van: {
    label: "Van",
    color: "hsl(var(--chart-2))",
  },
};

const feesBreakdownChartConfig: ChartConfig = {
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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [violations, setViolations] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [feesBreakdown, setFeesBreakdown] = useState<any[]>([]);

  // Fetch and process data from APIs
  useEffect(() => {
    const fetchData = async () => {
        try {
          // Fetch all violations
          const violationsResponse = await fetch("/api/violation?page=1&limit=1000", { // High limit to fetch all
            credentials: "include",
          });
          if (!violationsResponse.ok) {
            const errorData = await violationsResponse.json();
            throw new Error(`Failed to fetch violations: ${errorData.error || violationsResponse.statusText}`);
          }
          const violationData = await violationsResponse.json();
          console.log("Raw Violation Data from API:", violationData);
      
          // Fetch all payments
          const paymentsResponse = await fetch("/api/payment", {
            credentials: "include",
          });
          if (!paymentsResponse.ok) {
            const errorData = await paymentsResponse.json();
            throw new Error(`Failed to fetch payments: ${errorData.error || paymentsResponse.statusText}`);
          }
          const paymentData = await paymentsResponse.json();
          console.log("Raw Payment Data from API:", paymentData);
      
          const violationsArray = Array.isArray(violationData.violations) ? violationData.violations : violationData;
          const paymentsArray = Array.isArray(paymentData) ? paymentData : [];
          console.log("Processed Violations Array:", violationsArray);
          console.log("Processed Payments Array:", paymentsArray);
      
          // Process data
          const monthlyViolations = processMonthlyViolations(violationsArray);
          console.log("Monthly Violations Data:", monthlyViolations);
          setViolations(monthlyViolations);
      
          const monthlyFines = processMonthlyFines(paymentsArray);
          console.log("Monthly Fines Data:", monthlyFines);
          setFines(monthlyFines);
      
          const vehicleTypeViolations = processVehicleTypeViolations(violationsArray);
          console.log("Vehicle Type Violations Data:", vehicleTypeViolations);
          setVehicleTypes(vehicleTypeViolations);
      
          const feesBreakdownData = processFeesBreakdown(violationsArray);
          console.log("Fees Breakdown Data:", feesBreakdownData);
          setFeesBreakdown(feesBreakdownData);
        } catch (error) {
          console.error("Error fetching data:", error);
          toast.error(error instanceof Error ? error.message : "Failed to fetch dashboard data");
        }
      };

    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchData();
    }
  }, [status, session]);

  // Process monthly violations
  const processMonthlyViolations = (data: any[]) => {
    if (!Array.isArray(data)) {
      console.error("processMonthlyViolations: data is not an array", data);
      return [];
    }
    const months = ["January", "February", "March", "April", "May", "June"];
    const monthlyData = months.map((month, index) => {
      const violationsInMonth = data.filter((violation: any) => {
        const violationDate = new Date(violation.dateTime);
        console.log(`Checking ${violation.plateNumber} - Date: ${violationDate}, UTC Month: ${violationDate.getUTCMonth()}, UTC Year: ${violationDate.getUTCFullYear()}`); // Debug log
        return (
          violationDate.getUTCMonth() === index &&
          violationDate.getUTCFullYear() === 2025
        );
      }).length;
      return { month, violations: violationsInMonth };
    });
    return monthlyData;
  };

  const processMonthlyFines = (data: any[]) => {
    if (!Array.isArray(data)) {
      console.error("processMonthlyFines: data is not an array", data);
      return [];
    }
    const months = ["January", "February", "March", "April", "May", "June"];
    const monthlyData = months.map((month, index) => {
      const finesInMonth = data
        .filter((payment: any) => {
          const paymentDate = new Date(payment.dateTime);
          console.log(`Checking payment ${payment.id} - Date: ${paymentDate}, UTC Month: ${paymentDate.getUTCMonth()}, UTC Year: ${paymentDate.getUTCFullYear()}`); // Debug log
          return (
            paymentDate.getUTCMonth() === index &&
            paymentDate.getUTCFullYear() === 2025
          );
        })
        .reduce((sum: number, payment: any) => sum + payment.amount, 0);
      return { month, fines: finesInMonth };
    });
    return monthlyData;
  };
  
  const processVehicleTypeViolations = (data: any[]) => {
    if (!Array.isArray(data)) {
      console.error("processVehicleTypeViolations: data is not an array", data);
      return [];
    }
    const months = ["January", "February", "March", "April", "May", "June"];
    const vehicleTypes = ["MULTICAB", "VAN"];
    const monthlyData = months.map((month, index) => {
      const result: any = { month };
      vehicleTypes.forEach((type) => {
        const violationsInMonth = data.filter((violation: any) => {
          const violationDate = new Date(violation.dateTime);
          console.log(`Checking ${violation.plateNumber} (${type}) - Date: ${violationDate}, UTC Month: ${violationDate.getUTCMonth()}, UTC Year: ${violationDate.getUTCFullYear()}`); // Debug log
          return (
            violationDate.getUTCMonth() === index &&
            violationDate.getUTCFullYear() === 2025 &&
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
  const processFeesBreakdown = (data: any[]) => {
    if (!Array.isArray(data)) {
      console.error("processFeesBreakdown: data is not an array", data);
      return [];
    }
    const statusBreakdown = {
      PAID: 0,
      PARTIALLY_PAID: 0,
      UNPAID: 0,
    };

    data.forEach((violation: any) => {
      const paidAmount = violation.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
      const remaining = violation.fineAmount - paidAmount;
      console.log(`Processing violation ${violation.id} - Status: ${violation.status}, Paid: ${paidAmount}, Remaining: ${remaining}`); // Debug log

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

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    return <div>Access Denied: Only admins can view the dashboard.</div>;
  }

  const totalFees = feesBreakdown.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Total Number of Violations */}
        <Card>
          <CardHeader>
            <CardTitle>Total Number of Violations</CardTitle>
            <CardDescription>January - June 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={violationChartConfig}>
              <BarChart accessibilityLayer data={violations}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="violations" fill="var(--color-violations)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 font-medium leading-none">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Showing total violations for the last 6 months
            </div>
          </CardFooter>
        </Card>

        {/* Total Fines Collected */}
        <Card>
          <CardHeader>
            <CardTitle>Total Fines Collected</CardTitle>
            <CardDescription>January - June 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={finesChartConfig}>
              <BarChart
                accessibilityLayer
                data={fines}
                margin={{
                  top: 20,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="fines" fill="var(--color-fines)" radius={8}>
                  <LabelList
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 font-medium leading-none">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Showing total fines collected for the last 6 months
            </div>
          </CardFooter>
        </Card>

        {/* Violations by Vehicle Type */}
        <Card>
          <CardHeader>
            <CardTitle>Violations by Vehicle Type</CardTitle>
            <CardDescription>January - June 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={vehicleTypeChartConfig}>
              <LineChart
                accessibilityLayer
                data={vehicleTypes}
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
          <CardFooter>
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 font-medium leading-none">
                  Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 leading-none text-muted-foreground">
                  Showing violations by vehicle type for the last 6 months
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Total Fees Breakdown */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Total Fees Breakdown</CardTitle>
            <CardDescription>January - June 2025</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={feesBreakdownChartConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={feesBreakdown}
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
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium leading-none">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Breakdown of total fees for the last 6 months
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}