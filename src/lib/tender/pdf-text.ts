import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PDF_PAGES = 80;
const MAX_PDF_CHARS = 100_000;

type TextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

export async function extractPdfText(bytes: Buffer): Promise<{ text: string; pageCount: number } | null> {
  if (bytes.length < 8 || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return null;
  try {
    const task = getDocument({
      data: new Uint8Array(bytes),
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: true,
    } as Parameters<typeof getDocument>[0]);
    const doc = await task.promise;
    const totalPages = doc.numPages;
    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);
    const pages: string[] = [];
    for (let number = 1; number <= pageCount; number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      const body = pageText(content.items as TextItem[]);
      if (body) pages.push(`[[page:${number}]]\n${body}`);
      if (pages.join("\n").length >= MAX_PDF_CHARS) break;
    }
    await doc.destroy();
    const text = pages.join("\n").slice(0, MAX_PDF_CHARS).trim();
    if (text.replace(/\[\[page:\d+\]\]/g, "").trim().length < 40) return null;
    return { text, pageCount: totalPages };
  } catch {
    return null;
  }
}

function pageText(items: TextItem[]): string {
  const lines: string[] = [];
  let line = "";
  let lastX = 0;
  let lastY: number | null = null;
  for (const item of items) {
    const str = item.str ?? "";
    if (!str) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const width = item.width ?? 0;
    if (lastY != null && Math.abs(y - lastY) > 2) {
      if (line.trim()) lines.push(line.trim());
      line = "";
    } else if (line && x - lastX > Math.max(item.height ?? 0, 2)) {
      line += " ";
    }
    line += str;
    if (item.hasEOL) {
      if (line.trim()) lines.push(line.trim());
      line = "";
      lastY = null;
      continue;
    }
    lastX = x + width;
    lastY = y;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join("\n");
}
