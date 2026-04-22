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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const parsed = await pdfParse(Buffer.from(buffer));
    const text = parsed.text || "";

    console.info(`[pdf-extract] Text from PDF (first 500 chars): ${text.substring(0, 500)}`);

    // Look for common matric number patterns:
    // 1. YYYY/XXXX format (e.g., 2021/1182)
    // 2. Continuous digits (e.g., 22010306034)
    // 3. With explicit "Matric Number" label
    const patterns = [
      // Explicit "Matric No" or "Matric Number" labels
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{10,11})/i,        // "Matric Number: 22010306034"
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{4}\/\d{4,5})/i,  // "Matric Number: 2021/1182"
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{4}-\d{4,5})/i,   // "Matric Number: 2021-1182"
      /MATRIC\s*(?:NUMBER|NO|#)?[\s:]*(\d{4}\s+\d{4,5})/i, // "Matric Number: 2021 1182"
      // Without label - continuous digits first (10-11 digits is typical student matric)
      /\b(\d{10,11})\b/,                                     // 22010306034
      // Slashed format without label
      /(\d{4}\/\d{4,5})/,                                    // 2021/1182
      /(\d{4}-\d{4,5})/,                                     // 2021-1182
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Extract and normalize the matched matric number
        const extracted = match[1] || match[0];
        const normalized = normalizeMatricNumber(extracted.replace(/\s+/g, ""));
        
        console.info(`[pdf-extract] Pattern matched: ${pattern}, extracted: ${extracted}, normalized: ${normalized}`);
        
        // Validate it looks like a matric number (either YYYY/XXXX or continuous digits)
        if (/^\d{4}\/\d{4,5}$/.test(normalized) || /^\d{10,11}$/.test(normalized)) {
          console.info(`[pdf-extract] ✓ Valid matric found: ${normalized}`);
          return normalized;
        }
      }
    }

    // Some PDFs collapse table rows into one token stream (e.g., "122010306034NWAFOR").
    // Scan all 10-11 digit candidates and prioritize plausible admission-year prefixes.
    const relaxedDigitCandidates: string[] = [];
    for (const match of text.matchAll(/\d{10,11}/g)) {
      if (match[0]) {
        relaxedDigitCandidates.push(match[0]);
      }
    }
    for (const candidate of relaxedDigitCandidates) {
      if (/^(20|21|22|23|24|25)\d{8,9}$/.test(candidate)) {
        console.info(`[pdf-extract] ✓ Relaxed candidate matric found: ${candidate}`);
        return candidate;
      }
    }

    console.warn(`[pdf-extract] No matric pattern matched in PDF text`);
    return null;
  } catch (error) {
    console.warn("Failed to extract matric from PDF:", error);
    return null;
  }
}
