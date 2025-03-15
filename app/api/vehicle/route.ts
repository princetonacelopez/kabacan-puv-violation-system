// app/api/vehicle/route.ts
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
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "1000"); // Increase limit for debugging
    const skip = (page - 1) * limit;

    const vehicles = await prisma.vehicle.findMany({
      skip,
      take: limit,
      include: {
        violations: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        plateNumber: "asc",
      },
    });

    const total = await prisma.vehicle.count();
    const totalPages = Math.ceil(total / limit);

    console.log("Fetched vehicles with violations:", vehicles);
    console.log("Total vehicles in database:", total);
    return NextResponse.json({
      vehicles,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to fetch vehicles: ${errorMessage}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("Received POST body:", body);

    const { plateNumber, vehicleType, violationType } = body;

    if (!plateNumber || !vehicleType || !violationType) {
      console.log("Missing fields:", { plateNumber, vehicleType, violationType });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = session.user.id;
    if (!userId) {
      console.log("Invalid user ID:", userId);
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const fineAmount = vehicleType === "MULTICAB" ? 20 : 30;

    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber },
      update: {},
      create: {
        id: randomUUID(),
        plateNumber,
        vehicleType,
      },
    });
    console.log("Upserted vehicle:", vehicle);

    const violation = await prisma.violation.create({
      data: {
        id: randomUUID(),
        vehicle: {
          connect: { id: vehicle.id },
        },
        violationType,
        dateTime: new Date(),
        fineAmount,
        status: "UNPAID",
        creator: {
          connect: { id: userId },
        },
      },
    });
    console.log("Created violation:", violation);

    return NextResponse.json(violation);
  } catch (error) {
    console.error("Error creating vehicle violation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to create vehicle violation: ${errorMessage}` }, { status: 500 });
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
    console.log("Received PUT body:", body);

    const { plateNumber, vehicleType, violationType } = body;

    if (!plateNumber || !vehicleType || !violationType) {
      console.log("Missing fields (PUT):", { plateNumber, vehicleType, violationType });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber },
      update: {},
      create: {
        id: randomUUID(),
        plateNumber,
        vehicleType,
      },
    });

    const violation = await prisma.violation.update({
      where: { id },
      data: {
        vehicle: {
          connect: { id: vehicle.id },
        },
        violationType,
        dateTime: new Date(),
      },
      include: {
        vehicle: true,
        payments: true,
      },
    });

    console.log("Updated violation:", violation);
    return NextResponse.json(violation);
  } catch (error) {
    console.error("Error updating vehicle violation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to update vehicle violation: ${errorMessage}` }, { status: 500 });
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
    console.error("Error deleting vehicle violation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to delete vehicle violation: ${errorMessage}` }, { status: 500 });
  }
}