import { NormalizationResult, OverviewRow } from "./types";
import { buildHeaderMap, toDateISO, toNumber } from "./normalizeHelpers";

const OVERVIEW_ALIASES: Record<string, string[]> = {
  date: ["date", "day"],
  impressions: ["impressions", "impression", "views", "view"],
  engagements: ["engagements", "engagement"],
  profileVisits: ["profile visits", "profile visit", "profile views", "profile view", "profile clicks", "profile click"],
  newFollows: ["new follows", "new follow", "newfollows", "follows", "followers gained", "follower gains", "follows gained"]
};

const REQUIRED_FIELDS = ["date", "impressions"];
const OPTIONAL_FIELDS = ["engagements", "profileVisits", "newFollows"];

export function normalizeOverview(
  rows: Record<string, unknown>[],
  fields: string[]
): NormalizationResult<OverviewRow> {
  const headerMap = buildHeaderMap(fields, OVERVIEW_ALIASES);
  const missingRequired = REQUIRED_FIELDS.filter((field) => !headerMap[field]);
  const missingOptional = OPTIONAL_FIELDS.filter((field) => !headerMap[field]);
  const warnings: string[] = [];

  if (missingRequired.length > 0) {
    return { rows: [], missingRequired, missingOptional, warnings };
  }

  const normalizedRows = rows.map((row) => {
    return {
      date: toDateISO(row[headerMap.date as string]),
      impressions: toNumber(row[headerMap.impressions as string]),
      engagements: headerMap.engagements ? toNumber(row[headerMap.engagements]) : 0,
      profileVisits: headerMap.profileVisits ? toNumber(row[headerMap.profileVisits]) : 0,
      newFollows: headerMap.newFollows ? toNumber(row[headerMap.newFollows]) : 0
    };
  });

  if (normalizedRows.some((row) => !row.date)) {
    warnings.push("Some overview rows have invalid dates and will be skipped in trends.");
  }

  return { rows: normalizedRows, missingRequired, missingOptional, warnings };
}
