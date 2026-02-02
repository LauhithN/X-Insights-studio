export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function toDateISO(value: unknown): string {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
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
