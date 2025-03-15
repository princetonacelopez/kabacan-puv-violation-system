// app/api/payment/pay-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { violationIds, totalAmount } = body;

    if (!Array.isArray(violationIds) || violationIds.length === 0 || typeof totalAmount !== "number") {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    // Ensure totalAmount is a whole number
    const paymentAmount = Math.floor(totalAmount);
    if (paymentAmount <= 0) {
      return NextResponse.json({ error: "Total payment amount must be a positive whole number" }, { status: 400 });
    }

    const violations = await prisma.violation.findMany({
      where: {
        id: { in: violationIds },
      },
      include: {
        payments: true,
      },
    });

    if (violations.length !== violationIds.length) {
      return NextResponse.json({ error: "Some violations not found" }, { status: 404 });
    }

    // Calculate total fine and total paid for all violations
    let totalFine = 0;
    let totalPaidSoFar = 0;
    violations.forEach((violation) => {
      totalFine += violation.fineAmount;
      totalPaidSoFar += violation.payments.reduce((sum, payment) => sum + payment.amount, 0);
    });

    const remainingFine = totalFine - totalPaidSoFar;

    // Prevent overpayment
    if (paymentAmount > remainingFine) {
      return NextResponse.json(
        { error: `Total payment amount (${paymentAmount}) exceeds remaining fine (${remainingFine})` },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    await prisma.$transaction(async (tx) => {
      for (const violation of violations) {
        await tx.payment.create({
          data: {
            id: randomUUID(), // Generate UUID for new payment
            violationId: violation.id,
            amount: paymentAmount / violations.length, // Distribute equally (whole number)
            updatedBy: userId,
          },
        });

        const violationPayments = await tx.payment.findMany({
          where: { violationId: violation.id },
        });
        const newTotalPaid = violationPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const newRemaining = violation.fineAmount - newTotalPaid;
        let newStatus = violation.status;
        if (newRemaining <= 0) {
          newStatus = "PAID";
        } else if (newTotalPaid > 0) {
          newStatus = "PARTIALLY_PAID";
        }

        await tx.violation.update({
          where: { id: violation.id },
          data: { status: newStatus },
        });
      }
    });

    return NextResponse.json({ message: "All payments recorded successfully" });
  } catch (error) {
    console.error("Error recording pay-all:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to record pay-all: ${errorMessage}` }, { status: 500 });
  }
}