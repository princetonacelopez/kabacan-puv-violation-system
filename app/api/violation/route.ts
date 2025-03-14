// app/api/violation/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  try {
    const [violations, total] = await Promise.all([
      prisma.violation.findMany({
        skip,
        take: limit,
        include: {
          vehicle: true,
          payments: true,
        },
      }),
      prisma.violation.count(),
    ]);

    return NextResponse.json({
      violations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 });
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

    const { plateNumber, vehicleType, violationType, dateTime, fineAmount, status } = body;

    if (!plateNumber || !vehicleType || !violationType || !dateTime || !fineAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const violation = await prisma.violation.create({
      data: {
        vehicle: {
          connectOrCreate: {
            where: { plateNumber },
            create: {
              plateNumber,
              vehicleType,
            },
          },
        },
        violationType,
        dateTime: new Date(dateTime),
        fineAmount: parseFloat(fineAmount),
        status,
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