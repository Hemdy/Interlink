import React from "react";

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-interlink-app-bg text-interlink-ink">
      {/* Desktop sidebar placeholder */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-interlink-border bg-interlink-surface lg:block">
        <div className="flex h-[68px] items-center border-b border-interlink-border px-5">
          <div className="h-6 w-28 animate-pulse rounded bg-interlink-border/60" />
        </div>
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded-[4px] bg-interlink-border/40" />
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-interlink-border bg-interlink-surface/95 px-4 sm:px-8">
          <div className="h-6 w-44 animate-pulse rounded bg-interlink-border/60" />
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 animate-pulse rounded bg-interlink-border/50" />
            <div className="h-9 w-9 animate-pulse rounded bg-interlink-border/50" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 h-24 w-full animate-pulse rounded-[4px] border border-interlink-border bg-interlink-surface p-5" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[4px] border border-interlink-border bg-interlink-surface p-4"
              />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-64 animate-pulse rounded-[4px] border border-interlink-border bg-interlink-surface lg:col-span-7" />
            <div className="h-64 animate-pulse rounded-[4px] border border-interlink-border bg-interlink-surface lg:col-span-5" />
          </div>
        </main>
      </div>
    </div>
  );
}
