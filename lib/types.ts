export type ContentRow = {
  id?: string;
  text: string;
  createdAt: string;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  bookmarks: number;
  shares: number;
  profileVisits: number;
  newFollows: number;
};

export type OverviewRow = {
  date: string;
  impressions: number;
  engagements: number;
  profileVisits: number;
  newFollows: number;
};

export type NormalizationResult<T> = {
  rows: T[];
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
};

export const FIELD_LABELS: Record<string, string> = {
  text: "Post/Tweet text",
  createdAt: "Created at / Post time",
  impressions: "Impressions",
  likes: "Likes",
  replies: "Replies",
  reposts: "Reposts / Retweets",
  bookmarks: "Bookmarks",
  shares: "Shares",
  profileVisits: "Profile visits",
  newFollows: "New follows",
  date: "Date",
  engagements: "Engagements"
};
