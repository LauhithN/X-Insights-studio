import Papa, { type ParseError } from "papaparse";

export type ParsedCsv = {
  rows: Record<string, unknown>[];
  fields: string[];
  errors: string[];
  rowCount: number;
  truncated: boolean;
};

type ParseCsvOptions = {
  maxRows?: number;
};

const DEFAULT_MAX_ROWS = 120000;

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) => {
    if (value === null || value === undefined) return true;
    return String(value).trim() === "";
  });
}

function collectParseErrors(errors: ParseError[]): string[] {
  return errors
    .map((error) => error.message)
    .filter((message) => message && message.trim().length > 0);
}

export function parseCsv(file: File, options: ParseCsvOptions = {}): Promise<ParsedCsv> {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

  return new Promise((resolve) => {
    const rows: Record<string, unknown>[] = [];
    const fields: string[] = [];
    const parseErrors: string[] = [];
    let rowCount = 0;
    let truncated = false;

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      worker: true,
      step: (results, parser) => {
        if (results.meta.fields && fields.length === 0) {
          fields.push(...results.meta.fields);
        }

        const row = results.data ?? {};
        if (isEmptyRow(row)) {
          return;
        }

        if (maxRows > 0 && rowCount >= maxRows) {
          truncated = true;
          parser.abort();
          return;
        }

        rowCount += 1;
        rows.push(row);
      },
      complete: (results) => {
        parseErrors.push(...collectParseErrors(results.errors));
        if (truncated) {
          parseErrors.push(`Row limit exceeded. Only the first ${maxRows.toLocaleString()} rows were loaded.`);
        }

        resolve({
          rows,
          fields: results.meta.fields ?? fields,
          errors: Array.from(new Set(parseErrors)),
          rowCount,
          truncated
        });
      },
      error: (error) => {
        resolve({
          rows: [],
          fields: [],
          errors: [error.message || "Unable to parse this CSV file."],
          rowCount: 0,
          truncated: false
        });
      }
    });
  });
}
