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
      className="w-full rounded-full border border-neon/60 bg-neon/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
    >
      Demo mode
    </button>
  );
}
