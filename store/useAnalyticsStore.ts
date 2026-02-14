import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ContentRow, OverviewRow } from "@/lib/types";
import { demoContentRows, demoOverviewRows } from "@/lib/sampleData";

type AnalyticsState = {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
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

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
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
    }),
    {
      name: "x-insights-store-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        contentRows: state.contentRows,
        overviewRows: state.overviewRows,
        contentFileName: state.contentFileName,
        overviewFileName: state.overviewFileName,
        contentMissingOptional: state.contentMissingOptional,
        overviewMissingOptional: state.overviewMissingOptional
      })
    }
  )
);
