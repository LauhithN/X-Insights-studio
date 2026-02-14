import { ContentRow, FIELD_LABELS, NormalizationResult } from "./types";
import { buildHeaderMap, parseNumber, toText, toTimestampISO } from "./normalizeHelpers";

const CONTENT_ALIASES: Record<string, string[]> = {
  id: ["post id", "tweet id", "tweetid", "postid", "id"],
  text: ["post text", "tweet text", "text", "tweet", "post", "content", "body"],
  createdAt: ["created at", "post time", "tweet time", "time", "created", "timestamp", "date"],
  impressions: ["impressions", "impression", "views", "view"],
  likes: ["likes", "like"],
  replies: ["replies", "reply", "comments"],
  reposts: ["reposts", "repost", "retweets", "retweet", "reposts/retweets", "retweets/reposts"],
  bookmarks: ["bookmarks", "bookmark", "saves", "saved", "save"],
  shares: ["shares", "share"],
  profileVisits: ["profile visits", "profile visit", "profile views", "profile view", "profile clicks", "profile click"],
  newFollows: ["new follows", "new follow", "newfollows", "follows", "followers gained", "follower gains", "follows gained"]
};

const REQUIRED_FIELDS = ["text", "createdAt", "impressions"];
const OPTIONAL_FIELDS = [
  "id",
  "likes",
  "replies",
  "reposts",
  "bookmarks",
  "shares",
  "profileVisits",
  "newFollows"
];
type OptionalNumericField =
  | "likes"
  | "replies"
  | "reposts"
  | "bookmarks"
  | "shares"
  | "profileVisits"
  | "newFollows";

function countInvalid(target: Record<string, number>, field: string): void {
  target[field] = (target[field] ?? 0) + 1;
}

export function normalizeContent(
  rows: Record<string, unknown>[],
  fields: string[]
): NormalizationResult<ContentRow> {
  const headerMap = buildHeaderMap(fields, CONTENT_ALIASES);
  const missingRequired = REQUIRED_FIELDS.filter((field) => !headerMap[field]);
  const missingOptional = OPTIONAL_FIELDS.filter((field) => !headerMap[field]);
  const warnings: string[] = [];

  if (missingRequired.length > 0) {
    return { rows: [], missingRequired, missingOptional, warnings };
  }

  let droppedForImpressions = 0;
  let invalidTimestampCount = 0;
  const invalidOptionalCounts: Record<string, number> = {};

  const normalizedRows = rows.flatMap((row) => {
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

    const createdAt = toTimestampISO(row[headerMap.createdAt as string]);
    if (!createdAt) {
      invalidTimestampCount += 1;
    }

    return [
      {
        id: headerMap.id ? toText(row[headerMap.id]) : undefined,
        text: toText(row[headerMap.text as string]),
        createdAt,
        impressions: impressionsResult.value,
        likes: parseOptionalNumber("likes"),
        replies: parseOptionalNumber("replies"),
        reposts: parseOptionalNumber("reposts"),
        bookmarks: parseOptionalNumber("bookmarks"),
        shares: parseOptionalNumber("shares"),
        profileVisits: parseOptionalNumber("profileVisits"),
        newFollows: parseOptionalNumber("newFollows")
      }
    ];
  });

  if (droppedForImpressions > 0) {
    warnings.push(
      `${droppedForImpressions} row(s) were dropped because impressions were missing or invalid.`
    );
  }

  if (invalidTimestampCount > 0) {
    warnings.push(
      `${invalidTimestampCount} row(s) have invalid post timestamps and are excluded from time-based charts.`
    );
  }

  Object.entries(invalidOptionalCounts).forEach(([field, count]) => {
    const label = FIELD_LABELS[field] ?? field;
    warnings.push(
      `${count} row(s) had invalid "${label}" values and were treated as missing.`
    );
  });

  return { rows: normalizedRows, missingRequired, missingOptional, warnings };
}
