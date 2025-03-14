// app/api/payment/pay-all/route.ts
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
  console.log("Received pay-all body:", body);

  const { violationIds, totalAmount } = body;

  if (!violationIds || !Array.isArray(violationIds) || violationIds.length === 0 || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    console.log("Invalid input:", { violationIds, totalAmount });
    return NextResponse.json({ error: "Invalid violation IDs or total amount" }, { status: 400 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    console.log("Invalid user ID:", session.user.id);
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const violations = await prisma.violation.findMany({
      where: { id: { in: violationIds } },
      include: { payments: true },
    });

    if (violations.length !== violationIds.length) {
      console.log("Some violations not found:", { violationIds, found: violations.map(v => v.id) });
      return NextResponse.json({ error: "Some violations not found" }, { status: 404 });
    }

    const totalRemaining = violations.reduce((sum, v) => {
      const paid = v.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0;
      return sum + (v.fineAmount - paid);
    }, 0);

    if (totalAmount !== totalRemaining) {
      console.log("Total amount does not match remaining balance:", { totalAmount, totalRemaining });
      return NextResponse.json({ error: "Total amount does not match remaining balance" }, { status: 400 });
    }

    const transactions = violations.map((v) => {
      const paid = v.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0;
      const remaining = v.fineAmount - paid;
      return prisma.payment.create({
        data: {
          violation: { connect: { id: v.id } },
          amount: remaining,
          updater: { connect: { id: userId } }, // Use updater relation; remove updatedBy
        },
      });
    });

    const updates = violations.map((v) =>
      prisma.violation.update({
        where: { id: v.id },
        data: { status: "PAID" },
      })
    );

    const actions = violations.map((v) =>
      prisma.action.create({
        data: {
          user: { connect: { id: userId } },
          action: `Recorded full payment for violation ${v.id}, updated status to PAID`,
        },
      })
    );

    await prisma.$transaction([...transactions, ...updates, ...actions]);

    return NextResponse.json({ message: "All payments recorded" });
  } catch (error) {
    console.error("Failed to record pay-all:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to record all payments: ${errorMessage}` }, { status: 500 });
  }
}