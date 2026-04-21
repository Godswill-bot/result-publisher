import path from "node:path";

export function normalizeMatricNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function parseMatricNumberFromFilename(filename: string) {
  const baseName = path.basename(filename, path.extname(filename));
  const matricNumber = normalizeMatricNumber(baseName);

  if (!matricNumber) {
    throw new Error("PDF file name must contain a matric number");
  }

  if (!/^[A-Z0-9-]+$/.test(matricNumber)) {
    throw new Error("PDF file name can only use letters, numbers, and hyphens");
  }

  return matricNumber;
}

export function getResultStoragePath(matricNumber: string) {
  return `results/${normalizeMatricNumber(matricNumber)}.pdf`;
}

export function isPdfFile(file: File) {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

export async function extractMatricNumberFromPdf(buffer: ArrayBuffer): Promise<string | null> {
  try {
    // Use dynamic import to avoid issues in non-Node.js environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse");
    const data = await pdf(Buffer.from(buffer));
    const text = data.text;

    // Look for common matric number patterns:
    // 1. YYYY/XXXX format (e.g., 2021/1182)
    // 2. YYYY-XXXX format
    // 3. YYYYXXXX format (no separator)
    const patterns = [
      /(\d{4}\/\d{4,5})/,     // YYYY/XXXX or YYYY/XXXXX
      /(\d{4}-\d{4,5})/,      // YYYY-XXXX or YYYY-XXXXX
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{4}\/\d{4,5})/i,  // "Matric Number: 2021/1182"
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{4}-\d{4,5})/i,   // "Matric Number: 2021-1182"
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{4}\s+\d{4,5})/i, // "Matric Number: 2021 1182"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Extract and normalize the matched matric number
        const extracted = match[1] || match[0];
        const normalized = normalizeMatricNumber(extracted.replace(/\s+/g, "/"));
        
        // Validate it looks like a matric number
        if (/^\d{4}\/\d{4,5}$/.test(normalized)) {
          return normalized;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Failed to extract matric from PDF:", error);
    return null;
  }
}
