import { create } from "zustand";
import { ContentRow, OverviewRow } from "@/lib/types";
import { demoContentRows, demoOverviewRows } from "@/lib/sampleData";

type AnalyticsState = {
  contentRows: ContentRow[];
  overviewRows: OverviewRow[];
  contentFileName: string;
  overviewFileName: string;
  contentMissingOptional: string[];
  overviewMissingOptional: string[];
  setContentRows: (rows: ContentRow[], fileName?: string, missingOptional?: string[]) => void;
  setOverviewRows: (rows: OverviewRow[], fileName?: string, missingOptional?: string[]) => void;
  loadDemo: () => void;
  clear: () => void;
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  contentRows: [],
  overviewRows: [],
  contentFileName: "",
  overviewFileName: "",
  contentMissingOptional: [],
  overviewMissingOptional: [],
  setContentRows: (rows, fileName = "", missingOptional = []) =>
    set({ contentRows: rows, contentFileName: fileName, contentMissingOptional: missingOptional }),
  setOverviewRows: (rows, fileName = "", missingOptional = []) =>
    set({ overviewRows: rows, overviewFileName: fileName, overviewMissingOptional: missingOptional }),
  loadDemo: () =>
    set({
      contentRows: demoContentRows,
      overviewRows: demoOverviewRows,
      contentFileName: "demo_content.csv",
      overviewFileName: "demo_overview.csv",
      contentMissingOptional: [],
      overviewMissingOptional: []
    }),
  clear: () =>
    set({
      contentRows: [],
      overviewRows: [],
      contentFileName: "",
      overviewFileName: "",
      contentMissingOptional: [],
      overviewMissingOptional: []
    })
}));
