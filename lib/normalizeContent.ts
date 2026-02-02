import { ContentRow, NormalizationResult } from "./types";
import { buildHeaderMap, toDateISO, toNumber, toText } from "./normalizeHelpers";

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

  const normalizedRows = rows.map((row) => {
    const text = toText(row[headerMap.text as string]);
    const createdAt = toDateISO(row[headerMap.createdAt as string]);

    return {
      id: headerMap.id ? toText(row[headerMap.id]) : undefined,
      text,
      createdAt,
      impressions: toNumber(row[headerMap.impressions as string]),
      likes: headerMap.likes ? toNumber(row[headerMap.likes]) : 0,
      replies: headerMap.replies ? toNumber(row[headerMap.replies]) : 0,
      reposts: headerMap.reposts ? toNumber(row[headerMap.reposts]) : 0,
      bookmarks: headerMap.bookmarks ? toNumber(row[headerMap.bookmarks]) : 0,
      shares: headerMap.shares ? toNumber(row[headerMap.shares]) : 0,
      profileVisits: headerMap.profileVisits ? toNumber(row[headerMap.profileVisits]) : 0,
      newFollows: headerMap.newFollows ? toNumber(row[headerMap.newFollows]) : 0
    };
  });

  if (normalizedRows.some((row) => !row.createdAt)) {
    warnings.push("Some posts have invalid dates and will be skipped in time-based charts.");
  }

  return { rows: normalizedRows, missingRequired, missingOptional, warnings };
}
