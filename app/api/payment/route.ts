// app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payments = await prisma.payment.findMany({
      include: {
        violation: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to fetch payments: ${errorMessage}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { violationId, amount } = body;

    if (!violationId || typeof amount !== "number") {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    // Ensure amount is a whole number
    const paymentAmount = Math.floor(amount);
    if (paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be a positive whole number" }, { status: 400 });
    }

    const violation = await prisma.violation.findUnique({
      where: { id: violationId },
      include: { payments: true },
    });

    if (!violation) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }

    // Calculate total paid so far
    const totalPaid = violation.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingFine = violation.fineAmount - totalPaid;

    // Prevent overpayment
    if (paymentAmount > remainingFine) {
      return NextResponse.json(
        { error: `Payment amount (${paymentAmount}) exceeds remaining fine (${remainingFine})` },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const payment = await prisma.payment.create({
      data: {
        id: randomUUID(),
        violationId,
        amount: paymentAmount,
        updatedBy: userId,
      },
      include: {
        violation: true,
      },
    });

    // Update violation status based on new payment
    const newTotalPaid = totalPaid + paymentAmount;
    const newRemaining = violation.fineAmount - newTotalPaid;
    let newStatus = violation.status;
    if (newRemaining <= 0) {
      newStatus = "PAID";
    } else if (newTotalPaid > 0) {
      newStatus = "PARTIALLY_PAID";
    }

    await prisma.violation.update({
      where: { id: violationId },
      data: { status: newStatus },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error recording payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to record payment: ${errorMessage}` }, { status: 500 });
  }
}