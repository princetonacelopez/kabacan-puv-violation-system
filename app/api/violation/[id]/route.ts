import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface Params {
  id: string;
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { status, attachment } = body;

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const violationId = parseInt(params.id);
  const currentViolation = await prisma.violation.findUnique({
    where: { id: violationId },
  });

  if (!currentViolation) {
    return NextResponse.json({ error: "Violation not found" }, { status: 404 });
  }

  // Update violation and log the status change
  const updatedViolation = await prisma.$transaction([
    prisma.violation.update({
      where: { id: violationId },
      data: { status, attachment },
    }),
    prisma.action.create({
      data: {
        user: { connect: { id: userId } },
        action: `Updated violation ${violationId} status from ${currentViolation.status} to ${status || currentViolation.status}`,
      },
    }),
  ]);

  return NextResponse.json(updatedViolation[0]); // Return the updated violation
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const violationId = parseInt(params.id);
  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Delete violation and log the action
  await prisma.$transaction([
    prisma.violation.delete({
      where: { id: violationId },
    }),
    prisma.action.create({
      data: {
        user: { connect: { id: userId } },
        action: `Deleted violation ${violationId}`,
      },
    }),
  ]);

  return NextResponse.json({ message: "Violation deleted" });
}