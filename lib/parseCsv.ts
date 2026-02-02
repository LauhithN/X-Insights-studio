import Papa from "papaparse";

export type ParsedCsv = {
  rows: Record<string, unknown>[];
  fields: string[];
  errors: string[];
};

export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = Array.isArray(results.data) ? (results.data as Record<string, unknown>[]) : [];
        resolve({
          rows,
          fields: results.meta.fields ?? [],
          errors: results.errors.map((error) => error.message)
        });
      }
    });
  });
}
