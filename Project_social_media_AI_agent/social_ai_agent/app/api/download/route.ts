import { NextResponse } from "next/server";
import { excelManager } from "@/lib/excelManager";
import fs from "fs";

export async function GET(): Promise<NextResponse> {
  try {
    const filePath = excelManager.filePath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Excel file not found" }, { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="content_calendar.xlsx"',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
