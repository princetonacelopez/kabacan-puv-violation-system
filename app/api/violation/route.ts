// app/api/violation/route.ts (relevant section)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 500); // Cap limit at 500
    const skip = (page - 1) * limit;

    const violations = await prisma.violation.findMany({
      skip,
      take: limit,
      include: {
        vehicle: true,
        payments: true,
      },
      orderBy: {
        dateTime: "desc",
      },
    });

    const total = await prisma.violation.count();
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      violations,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching violations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to fetch violations: ${errorMessage}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("Received violation body:", body);

    const { plateNumber, vehicleType, violationType, dateTime } = body;

    if (!plateNumber || !vehicleType || !violationType || !dateTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = session.user.id; // Already a string (UUID)
    if (!userId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const fineAmount = vehicleType === "MULTICAB" ? 20 : 30; // Whole number fines

    const violation = await prisma.violation.create({
      data: {
        id: randomUUID(), // Generate UUID for new violation
        vehicle: {
          connectOrCreate: {
            where: { plateNumber },
            create: {
              id: randomUUID(), // Generate UUID for new vehicle
              plateNumber,
              vehicleType,
            },
          },
        },
        violationType,
        dateTime: new Date(dateTime),
        fineAmount,
        status: "UNPAID",
        creator: { connect: { id: userId } },
      },
    });

    return NextResponse.json(violation);
  } catch (error) {
    console.error("Error creating violation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to create violation: ${errorMessage}` }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "Invalid violation ID" }, { status: 400 });
    }

    const body = await req.json();
    const { plateNumber, vehicleType, violationType, dateTime } = body;

    if (!plateNumber || !vehicleType || !violationType || !dateTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const violation = await prisma.violation.update({
      where: { id },
      data: {
        vehicle: {
          connectOrCreate: {
            where: { plateNumber },
            create: {
              id: randomUUID(), // Generate UUID for new vehicle
              plateNumber,
              vehicleType,
            },
          },
        },
        violationType,
        dateTime: new Date(dateTime),
      },
      include: {
        vehicle: true,
        payments: true,
      },
    });

    return NextResponse.json(violation);
  } catch (error) {
    console.error("Error updating violation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to update violation: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "Invalid violation ID" }, { status: 400 });
    }

    await prisma.violation.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Violation deactivated successfully" });
  } catch (error) {
    console.error("Error deleting violation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to delete violation: ${errorMessage}` }, { status: 500 });
  }
}