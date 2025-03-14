// app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payments = await prisma.payment.findMany({
      include: {
        violation: true,
      },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  console.log("Received payment body:", body);

  const { violationId, amount } = body;

  if (!violationId || !Number.isFinite(amount) || amount <= 0) {
    console.log("Invalid input:", { violationId, amount });
    return NextResponse.json({ error: "Invalid violation ID or amount" }, { status: 400 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    console.log("Invalid user ID:", session.user.id);
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const violation = await prisma.violation.findUnique({
    where: { id: violationId },
    include: { payments: true },
  });

  if (!violation) {
    console.log("Violation not found:", violationId);
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  const totalPaid = violation.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = violation.fineAmount - totalPaid;

  if (amount > remainingBalance) {
    console.log("Payment exceeds remaining balance:", { amount, remainingBalance });
    return NextResponse.json({ error: "Payment amount exceeds remaining balance" }, { status: 400 });
  }

  const newStatus = amount === remainingBalance ? "PAID" : totalPaid + amount < violation.fineAmount ? "PARTIALLY_PAID" : "PAID";

  try {
    const updatedViolation = await prisma.$transaction([
      prisma.payment.create({
        data: {
          violation: { connect: { id: violationId } },
          amount,
          updater: { connect: { id: userId } },
        },
      }),
      prisma.violation.update({
        where: { id: violationId },
        data: { status: newStatus },
      }),
      prisma.action.create({
        data: {
          user: { connect: { id: userId } },
          action: `Recorded payment of ₱${amount} for violation ${violationId}, updated status to ${newStatus}`,
        },
      }),
    ]);

    return NextResponse.json(updatedViolation[1]);
  } catch (error) {
    console.error("Failed to record payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to record payment: ${errorMessage}` }, { status: 500 });
  }
}