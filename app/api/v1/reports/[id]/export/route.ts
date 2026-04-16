export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import {
  getReport,
  REPORT_IDS,
  REPORT_DEFINITIONS,
  type ReportId,
  type ReportResult,
} from "@/lib/reports/service";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ── CSV helpers ───────────────────────────────────────────────────────────────

function quoteField(value: string): string {
  if (/[,"\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

function buildCsv(
  result: ReportResult,
  title: string,
  from: string,
  to: string
): string {
  const BOM = "\uFEFF";
  const lines = [
    `# Report: ${title}`,
    `# Period: ${from} to ${to}`,
    `# Generated: ${new Date().toISOString()}`,
    result.columns.map(quoteField).join(","),
    ...result.rows.map((row) =>
      result.columns
        .map((col) => quoteField(String(row[col] ?? "")))
        .join(",")
    ),
  ];
  return BOM + lines.join("\r\n");
}

// ── PDF helpers ───────────────────────────────────────────────────────────────

async function buildPdf(
  result: ReportResult,
  title: string,
  from: string,
  to: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();
  const margin = 50;
  const usableWidth = width - margin * 2;

  // Title
  page.drawText(title, {
    x: margin,
    y: height - margin - 24,
    font: bold,
    size: 18,
    color: rgb(0.12, 0.18, 0.24),
  });

  // Meta
  page.drawText(`Period: ${from} — ${to}`, {
    x: margin,
    y: height - margin - 46,
    font: regular,
    size: 10,
    color: rgb(0.39, 0.45, 0.49),
  });
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: margin,
    y: height - margin - 60,
    font: regular,
    size: 10,
    color: rgb(0.39, 0.45, 0.49),
  });

  // Separator
  let y = height - margin - 82;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.88, 0.9, 0.92),
  });
  y -= 16;

  // Column headers
  const colCount = result.columns.length;
  const colWidth = usableWidth / colCount;
  for (let i = 0; i < colCount; i++) {
    page.drawText(result.columns[i].toUpperCase(), {
      x: margin + i * colWidth,
      y,
      font: bold,
      size: 8,
      color: rgb(0.28, 0.35, 0.43),
    });
  }
  y -= 12;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.88, 0.9, 0.92),
  });
  y -= 14;

  // Data rows — add extra pages if needed
  let currentPage = page;
  for (const row of result.rows) {
    if (y < margin + 20) {
      currentPage = pdfDoc.addPage([595, 842]);
      y = currentPage.getSize().height - margin;
    }
    for (let i = 0; i < colCount; i++) {
      const val = String(row[result.columns[i]] ?? "");
      currentPage.drawText(val, {
        x: margin + i * colWidth,
        y,
        font: regular,
        size: 9,
        color: rgb(0.12, 0.18, 0.24),
      });
    }
    y -= 18;
  }

  return pdfDoc.save();
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!(REPORT_IDS as readonly string[]).includes(id)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Unknown report: ${id}` } },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "format must be csv or pdf" } },
      { status: 400 }
    );
  }

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const fromLabel = fromParam ?? "all-time";
  const toLabel = toParam ?? new Date().toISOString().split("T")[0];

  const range = {
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  };

  const result = await getReport(id as ReportId, range);
  const def = REPORT_DEFINITIONS.find((d) => d.id === id)!;
  const safeName = `${id}-${fromLabel}-${toLabel}`;

  if (format === "csv") {
    const csv = buildCsv(result, def.title, fromLabel, toLabel);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.csv"`,
      },
    });
  }

  const pdfBytes = await buildPdf(result, def.title, fromLabel, toLabel);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
