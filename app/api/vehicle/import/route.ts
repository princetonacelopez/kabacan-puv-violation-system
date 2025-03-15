// app/api/violation/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const fileType = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());
    let violations: any[] = [];

    if (fileType === "application/json") {
      const jsonData = JSON.parse(buffer.toString());
      if (!Array.isArray(jsonData)) {
        return NextResponse.json({ error: "JSON file must contain an array of violations" }, { status: 400 });
      }
      violations = jsonData;
    } else if (fileType === "text/csv" || fileType === "application/vnd.ms-excel") {
      const csvData = await new Promise<any[]>((resolve, reject) => {
        const records: any[] = [];
        const stream = Readable.from(buffer);
        stream
          .pipe(parse({ columns: true, trim: true }))
          .on("data", (record) => records.push(record))
          .on("end", () => resolve(records))
          .on("error", (error) => reject(error));
      });
      violations = csvData;
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use JSON or CSV." }, { status: 400 });
    }

    const errors: string[] = [];

    for (const [index, violation] of violations.entries()) {
      const { plateNumber, vehicleType, violationType, dateTime } = violation;

      if (!plateNumber || !vehicleType || !violationType || !dateTime) {
        errors.push(`Row ${index + 1}: Missing required fields (plateNumber, vehicleType, violationType, dateTime)`);
        continue;
      }

      const plateRegex = /^[A-Z]{3}-[0-9]{4}$/;
      if (!plateRegex.test(plateNumber)) {
        errors.push(`Row ${index + 1}: Invalid plate number format. Must be LLL-DDDD (e.g., ABC-1234)`);
        continue;
      }

      if (!["MULTICAB", "VAN"].includes(vehicleType)) {
        errors.push(`Row ${index + 1}: Invalid vehicle type. Must be MULTICAB or VAN`);
        continue;
      }

      if (violationType !== "TERMINAL_FEE") {
        errors.push(`Row ${index + 1}: Invalid violation type. Must be TERMINAL_FEE`);
        continue;
      }

      const parsedDate = new Date(dateTime);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Row ${index + 1}: Invalid dateTime format. Must be a valid ISO string (e.g., 2025-03-14T12:00:00Z)`);
        continue;
      }

      violation.dateTime = parsedDate;
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const violation of violations) {
        const { plateNumber, vehicleType, violationType, dateTime } = violation;
        const fineAmount = vehicleType === "MULTICAB" ? 20 : 30;

        const vehicle = await tx.vehicle.upsert({
          where: { plateNumber },
          update: {},
          create: {
            id: randomUUID(),
            plateNumber,
            vehicleType,
          },
        });

        await tx.violation.create({
          data: {
            id: randomUUID(),
            vehicle: { connect: { id: vehicle.id } },
            violationType,
            dateTime,
            fineAmount,
            status: "UNPAID",
            creator: { connect: { id: userId } },
          },
        });
      }
    });

    return NextResponse.json({ message: "Violations imported successfully" });
  } catch (error) {
    console.error("Error importing violations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to import violations: ${errorMessage}` }, { status: 500 });
  }
}