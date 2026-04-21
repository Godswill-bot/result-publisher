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
