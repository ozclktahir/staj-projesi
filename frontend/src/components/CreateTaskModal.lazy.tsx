"use client";

import dynamic from "next/dynamic";

export const CreateTaskModalLazy = dynamic(
  () =>
    import("@/components/CreateTaskModal").then((m) => m.CreateTaskModal),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-28 animate-pulse rounded-md bg-muted" aria-hidden />
    ),
  },
);
