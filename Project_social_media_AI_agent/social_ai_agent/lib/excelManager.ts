import ExcelJS from "exceljs";
import path from "path";
import { put, list } from "@vercel/blob";
import { ContentRow, ContentStatus } from "./types";

const EXCEL_PATH = path.resolve(process.cwd(), "content_calendar.xlsx");
const EXCEL_BLOB_PATH = "content_calendar.xlsx";
const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// On Vercel the local filesystem is read-only/ephemeral, so the workbook is
// persisted to Vercel Blob instead whenever a Blob store is connected.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

async function findBlobUrl(pathname: string): Promise<string | null> {
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  return blobs.find((b) => b.pathname === pathname)?.url ?? null;
}

const COLUMNS: Array<{ header: string; key: keyof ContentRow; width: number }> =
  [
    { header: "Date", key: "date", width: 14 },
    { header: "Topic", key: "topic", width: 32 },
    { header: "LinkedIn POST", key: "linkedinPost", width: 40 },
    { header: "Medium Article", key: "mediumArticle", width: 40 },
    { header: "IG Script", key: "igScript", width: 40 },
    { header: "YT Script", key: "ytScript", width: 40 },
    { header: "Dev.to Article", key: "devtoArticle", width: 40 },
    { header: "Status", key: "status", width: 12 },
    { header: "LinkedIn Image", key: "linkedinImage", width: 36 },
    { header: "Medium Image", key: "mediumImage", width: 36 },
    { header: "IG Image", key: "igImage", width: 36 },
    { header: "Last Updated", key: "lastUpdated", width: 22 },
    { header: "Error Message", key: "errorMessage", width: 40 },
  ];

// Serialised mutex — prevent concurrent writes corrupting the workbook.
let writeLock = Promise.resolve();

function acquireLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeLock.then(() => fn());
  writeLock = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(EXCEL_PATH);
  } catch {
    // File doesn't exist yet — bootstrap it.
    const ws = wb.addWorksheet("Content Calendar");
    ws.columns = COLUMNS.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));
    const headerRow = ws.getRow(1);
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F6EF7" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.commit();
    await wb.xlsx.writeFile(EXCEL_PATH);
  }
  return wb;
}

function getOrCreateSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  const ws = wb.getWorksheet("Content Calendar") ?? wb.addWorksheet("Content Calendar");
  // ExcelJS does NOT restore column key mappings when reading from disk.
  // Re-apply them so addRow({key: value}) works correctly.
  ws.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));
  return ws;
}

function rowToContentRow(row: ExcelJS.Row): ContentRow | null {
  const v = (k: number) => {
    const cell = row.getCell(k);
    const val = cell.value;
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return val.toISOString().split("T")[0];
    return String(val);
  };
  const date = v(1);
  if (!date) return null;
  return {
    date: v(1),
    topic: v(2),
    linkedinPost: v(3),
    mediumArticle: v(4),
    igScript: v(5),
    ytScript: v(6),
    devtoArticle: v(7),
    status: (v(8) || "Pending") as ContentStatus,
    linkedinImage: v(9),
    mediumImage: v(10),
    igImage: v(11),
    lastUpdated: v(12),
    errorMessage: v(13),
  };
}

export class ExcelManager {
  async readAll(): Promise<ContentRow[]> {
    const wb = await loadWorkbook();
    const ws = getOrCreateSheet(wb);
    const rows: ContentRow[] = [];
    ws.eachRow((row, idx) => {
      if (idx === 1) return; // header
      const r = rowToContentRow(row);
      if (r) rows.push(r);
    });
    return rows;
  }

  async readByDate(date: string): Promise<ContentRow | null> {
    const rows = await this.readAll();
    return rows.find((r) => r.date === date) ?? null;
  }

  async appendRow(row: ContentRow): Promise<void> {
    return acquireLock(async () => {
      const wb = await loadWorkbook();
      const ws = getOrCreateSheet(wb);
      ws.addRow({
        ...row,
        lastUpdated: new Date().toISOString(),
      });
      await wb.xlsx.writeFile(EXCEL_PATH);
    });
  }

  async updateRow(date: string, patch: Partial<ContentRow>): Promise<void> {
    return acquireLock(async () => {
      const wb = await loadWorkbook();
      const ws = getOrCreateSheet(wb);

      let found = false;
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const cell = row.getCell(1);
        const cellDate =
          cell.value instanceof Date
            ? cell.value.toISOString().split("T")[0]
            : String(cell.value ?? "");
        if (cellDate !== date) return;
        found = true;

        const colMap: Record<keyof ContentRow, number> = {
          date: 1,
          topic: 2,
          linkedinPost: 3,
          mediumArticle: 4,
          igScript: 5,
          ytScript: 6,
          devtoArticle: 7,
          status: 8,
          linkedinImage: 9,
          mediumImage: 10,
          igImage: 11,
          lastUpdated: 12,
          errorMessage: 13,
        };

        for (const [k, v] of Object.entries(patch)) {
          const colIdx = colMap[k as keyof ContentRow];
          if (colIdx) row.getCell(colIdx).value = v as string;
        }
        row.getCell(colMap.lastUpdated).value = new Date().toISOString();
        row.commit();
      });

      if (!found) throw new Error(`No row found for date ${date}`);
      await wb.xlsx.writeFile(EXCEL_PATH);
    });
  }

  async upsertRow(row: ContentRow): Promise<void> {
    const existing = await this.readByDate(row.date);
    if (existing) {
      await this.updateRow(row.date, row);
    } else {
      await this.appendRow(row);
    }
  }

  filePath(): string {
    return EXCEL_PATH;
  }
}

export const excelManager = new ExcelManager();
