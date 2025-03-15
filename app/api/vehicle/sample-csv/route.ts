// app/api/vehicle/sample-csv/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Define CSV headers based on the model
    const headers = ["plateNumber", "vehicleType", "violationType", "dateTime"];
    const csvContent = headers.join(",") + "\n";

    // Return the CSV file as a response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="sample-vehicle-import.csv"',
      },
    });
  } catch (error) {
    console.error("Error generating sample CSV:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Failed to generate sample CSV: ${errorMessage}` }, { status: 500 });
  }
}