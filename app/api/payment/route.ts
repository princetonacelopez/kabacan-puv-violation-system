import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { violationId, amount } = body;

  if (!violationId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Fetch the violation to calculate remaining balance
  const violation = await prisma.violation.findUnique({
    where: { id: violationId },
    include: { payments: true },
  });

  if (!violation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  const totalPaid = violation.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
  const remainingBalance = violation.fineAmount - totalPaid;
  const status =
    remainingBalance <= 0 ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

  // Create payment and update violation status
  const payment = await prisma.payment.create({
    data: {
      violation: { connect: { id: violationId } },
      amount,
      updater: { connect: { id: userId } },
    },
  });

  await prisma.violation.update({
    where: { id: violationId },
    data: { status },
  });

  return NextResponse.json({ payment, updatedStatus: status }, { status: 201 });
}