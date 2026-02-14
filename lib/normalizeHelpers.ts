export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ParsedNumber = {
  value: number | null;
  reason: "missing" | "invalid" | null;
};

const DATE_ONLY_REGEX = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;

function normalizeDateOnly(raw: string): string | null {
  const match = raw.match(DATE_ONLY_REGEX);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseNumber(value: unknown): ParsedNumber {
  if (value === null || value === undefined) {
    return { value: null, reason: "missing" };
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return { value, reason: null };
    }
    return { value: null, reason: "invalid" };
  }

  const text = String(value).trim();
  if (!text) {
    return { value: null, reason: "missing" };
  }

  const cleaned = text.replace(/,/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return { value: null, reason: "invalid" };
  }

  return { value: parsed, reason: null };
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function toTimestampISO(value: unknown): string {
  if (!value) return "";

  const text = String(value).trim();
  if (!text) return "";

  const dateOnly = normalizeDateOnly(text);
  if (dateOnly) {
    return `${dateOnly}T00:00:00.000Z`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}

export function toDateKey(value: unknown): string {
  if (!value) return "";

  const text = String(value).trim();
  if (!text) return "";

  const dateOnly = normalizeDateOnly(text);
  if (dateOnly) {
    return dateOnly;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function buildHeaderMap(fields: string[], aliases: Record<string, string[]>): Record<string, string | null> {
  const normalizedFields = new Map<string, string>();
  fields.forEach((field) => {
    normalizedFields.set(normalizeHeader(field), field);
  });

  const map: Record<string, string | null> = {};

  Object.entries(aliases).forEach(([canonical, aliasList]) => {
    let match: string | null = null;

    for (const alias of aliasList) {
      const normalizedAlias = normalizeHeader(alias);
      if (normalizedFields.has(normalizedAlias)) {
        match = normalizedFields.get(normalizedAlias) ?? null;
        break;
      }
    }

    if (!match) {
      for (const [normalizedField, originalField] of normalizedFields.entries()) {
        if (aliasList.some((alias) => normalizedField.includes(normalizeHeader(alias)))) {
          match = originalField;
          break;
        }
      }
    }

    map[canonical] = match;
  });

  return map;
}
