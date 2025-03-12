import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Total violations and status breakdown
  const violationStats = await prisma.violation.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });

  const totalViolations = await prisma.violation.count();
  const statusBreakdown = {
    unpaid: 0,
    partiallyPaid: 0,
    paid: 0,
  };

  violationStats.forEach((stat) => {
    if (stat.status === "UNPAID") statusBreakdown.unpaid = stat._count.status;
    if (stat.status === "PARTIALLY_PAID") statusBreakdown.partiallyPaid = stat._count.status;
    if (stat.status === "PAID") statusBreakdown.paid = stat._count.status;
  });

  // Total fines collected
  const totalFinesCollected = await prisma.payment.aggregate({
    _sum: { amount: true },
  });

  // Recent violations (last 7 days)
  const recentViolations = await prisma.violation.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    include: { vehicle: true, creator: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // User activity logs
  const userActivity = await prisma.action.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  // Violations by vehicle type
  const violationsWithVehicles = await prisma.violation.findMany({
    select: {
      vehicle: {
        select: { vehicleType: true },
      },
    },
  });

  const vehicleTypeBreakdown = {
    multicab: 0,
    van: 0,
  };

  violationsWithVehicles.forEach((v) => {
    if (v.vehicle?.vehicleType === "MULTICAB") vehicleTypeBreakdown.multicab += 1;
    if (v.vehicle?.vehicleType === "VAN") vehicleTypeBreakdown.van += 1;
  });

  return NextResponse.json({
    totalViolations,
    statusBreakdown,
    totalFinesCollected: totalFinesCollected._sum.amount || 0,
    recentViolations,
    userActivity,
    vehicleTypeBreakdown,
  });
}