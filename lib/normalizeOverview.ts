import { FIELD_LABELS, NormalizationResult, OverviewRow } from "./types";
import { buildHeaderMap, parseNumber, toDateKey } from "./normalizeHelpers";

const OVERVIEW_ALIASES: Record<string, string[]> = {
  date: ["date", "day"],
  impressions: ["impressions", "impression", "views", "view"],
  engagements: ["engagements", "engagement"],
  profileVisits: ["profile visits", "profile visit", "profile views", "profile view", "profile clicks", "profile click"],
  newFollows: ["new follows", "new follow", "newfollows", "follows", "followers gained", "follower gains", "follows gained"],
  likes: ["likes", "like"],
  bookmarks: ["bookmarks", "bookmark"],
  shares: ["shares", "share"],
  unfollows: ["unfollows", "unfollow", "followers lost"],
  replies: ["replies", "reply"],
  reposts: ["reposts", "repost", "retweets", "retweet"],
  createPost: ["create post", "posts created", "tweets", "posts", "post count"],
  videoViews: ["video views", "video view"],
  mediaViews: ["media views", "media view", "media engagements"]
};

const REQUIRED_FIELDS = ["date", "impressions"];
const OPTIONAL_FIELDS = [
  "engagements", "profileVisits", "newFollows",
  "likes", "bookmarks", "shares", "unfollows",
  "replies", "reposts", "createPost", "videoViews", "mediaViews"
];
type OptionalNumericField = typeof OPTIONAL_FIELDS[number];

function countInvalid(target: Record<string, number>, field: string): void {
  target[field] = (target[field] ?? 0) + 1;
}

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

  let droppedForDate = 0;
  let droppedForImpressions = 0;
  const invalidOptionalCounts: Record<string, number> = {};

  const normalizedRows = rows.flatMap((row) => {
    const date = toDateKey(row[headerMap.date as string]);
    if (!date) {
      droppedForDate += 1;
      return [];
    }

    const impressionsResult = parseNumber(row[headerMap.impressions as string]);
    if (impressionsResult.value === null) {
      droppedForImpressions += 1;
      return [];
    }

    const parseOptionalNumber = (field: OptionalNumericField): number | null => {
      const columnName = headerMap[field];
      if (!columnName) {
        return null;
      }

      const result = parseNumber(row[columnName]);
      if (result.reason === "invalid") {
        countInvalid(invalidOptionalCounts, field);
      }
      return result.value;
    };

    return [
      {
        date,
        impressions: impressionsResult.value,
        engagements: parseOptionalNumber("engagements"),
        profileVisits: parseOptionalNumber("profileVisits"),
        newFollows: parseOptionalNumber("newFollows"),
        likes: parseOptionalNumber("likes"),
        bookmarks: parseOptionalNumber("bookmarks"),
        shares: parseOptionalNumber("shares"),
        unfollows: parseOptionalNumber("unfollows"),
        replies: parseOptionalNumber("replies"),
        reposts: parseOptionalNumber("reposts"),
        createPost: parseOptionalNumber("createPost"),
        videoViews: parseOptionalNumber("videoViews"),
        mediaViews: parseOptionalNumber("mediaViews")
      }
    ];
  });

  if (droppedForDate > 0) {
    warnings.push(`${droppedForDate} overview row(s) were dropped due to invalid dates.`);
  }

  if (droppedForImpressions > 0) {
    warnings.push(
      `${droppedForImpressions} overview row(s) were dropped because impressions were missing or invalid.`
    );
  }

  Object.entries(invalidOptionalCounts).forEach(([field, count]) => {
    const label = FIELD_LABELS[field] ?? field;
    warnings.push(
      `${count} overview row(s) had invalid "${label}" values and were treated as missing.`
    );
  });

  return { rows: normalizedRows, missingRequired, missingOptional, warnings };
}
