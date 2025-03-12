import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plateNumber } = body;

  if (!plateNumber) {
    return NextResponse.json({ error: "Plate number required" }, { status: 400 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Fetch vehicle and its unpaid/partially paid violations
  const vehicle = await prisma.vehicle.findUnique({
    where: { plateNumber },
    include: {
      violations: {
        where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
        include: { payments: true },
      },
    },
  });

  if (!vehicle || vehicle.violations.length === 0) {
    return NextResponse.json({ error: "No unpaid violations found" }, { status: 404 });
  }

  // Calculate total remaining balance
  const totalRemaining = vehicle.violations.reduce((sum, v) => {
    const paid = v.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + (v.fineAmount - paid);
  }, 0);

  // Create a single payment to cover all remaining balances
  const paymentPromises = vehicle.violations.map(async (violation) => {
    const paidAmount = violation.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = violation.fineAmount - paidAmount;
    if (remaining > 0) {
      await prisma.payment.create({
        data: {
          violation: { connect: { id: violation.id } },
          amount: remaining,
          updater: { connect: { id: userId } },
        },
      });
      await prisma.violation.update({
        where: { id: violation.id },
        data: { status: "PAID" },
      });
    }
  });

  await Promise.all(paymentPromises);

  return NextResponse.json({ message: "All violations paid", totalPaid: totalRemaining }, { status: 200 });
}