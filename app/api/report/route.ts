import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const plateNumber = searchParams.get("plateNumber");
  const violationType = searchParams.get("violationType");
  const status = searchParams.get("status");

  if (startDate && isNaN(new Date(startDate).getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }
  if (endDate && isNaN(new Date(endDate).getTime())) {
    return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
  }

  const where: any = {};
  if (startDate) where.dateTime = { gte: new Date(startDate) };
  if (endDate) where.dateTime = { ...where.dateTime, lte: new Date(endDate) };
  if (plateNumber) where.vehicle = { plateNumber };
  if (violationType) where.violationType = violationType;
  if (status) where.status = status;

  const violations = await prisma.violation.findMany({
    where,
    include: {
      vehicle: true,
      payments: true,
      creator: { select: { username: true } },
    },
  });

  return NextResponse.json(violations);
}