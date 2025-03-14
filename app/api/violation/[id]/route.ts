// app/api/violation/route.ts
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
  console.log("Received POST body:", body); // Log the request body for debugging

  const { plateNumber, vehicleType, violationType, dateTime, attachment } = body;

  // Validate required fields
  if (!plateNumber || !vehicleType || !violationType || !dateTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Calculate fine amount
  const fineAmount = vehicleType === "MULTICAB" ? 20 : 30;

  // Upsert vehicle if it doesn’t exist
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber },
    update: {},
    create: { plateNumber, vehicleType },
  });

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Create violation
  const violation = await prisma.violation.create({
    data: {
      vehicle: { connect: { id: vehicle.id } },
      violationType,
      dateTime: new Date(dateTime),
      location: "", // Default to empty string since location is removed from the form
      fineAmount,
      status: "UNPAID",
      attachment,
      creator: { connect: { id: userId } },
    },
  });

  return NextResponse.json(violation, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const plateNumber = searchParams.get("plateNumber");

  if (plateNumber) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { plateNumber },
      include: {
        violations: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const violations = vehicle.violations.map((violation) => {
      const paidAmount = violation.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingBalance = violation.fineAmount - paidAmount;
      return {
        ...violation,
        paidAmount,
        remainingBalance,
      };
    });

    const totalFines = violations.reduce((sum, v) => sum + v.fineAmount, 0);
    const totalPaid = violations.reduce((sum, v) => sum + v.paidAmount, 0);
    const totalRemaining = totalFines - totalPaid;

    return NextResponse.json({
      vehicle: {
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
      },
      violations,
      fineSummary: {
        totalFines,
        totalPaid,
        remainingBalance: totalRemaining,
      },
    });
  } else {
    const violations = await prisma.violation.findMany({
      include: { vehicle: true, payments: true },
    });
    return NextResponse.json(violations);
  }
}