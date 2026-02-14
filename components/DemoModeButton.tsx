"use client";

import { useRouter } from "next/navigation";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export default function DemoModeButton() {
  const router = useRouter();
  const loadDemo = useAnalyticsStore((state) => state.loadDemo);

  return (
    <button
      onClick={() => {
        loadDemo();
        router.push("/dashboard");
      }}
      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon/50"
    >
      Try demo mode
    </button>
  );
}
