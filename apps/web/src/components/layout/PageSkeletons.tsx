import React from "react";

function PulseBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-interlink-border/55 ${className}`} />;
}

export function DashboardFeedSkeleton() {
  return (
    <div className="mx-auto max-w-[680px] space-y-5" aria-busy="true" aria-label="Loading feed">
      {/* Story rings strip */}
      <div className="no-scrollbar flex items-center gap-3.5 overflow-hidden pb-1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <PulseBlock className="h-14 w-14 rounded-full" />
            <PulseBlock className="h-2.5 w-10 rounded-full" />
          </div>
        ))}
      </div>

      {/* Filter pills row */}
      <div className="no-scrollbar flex items-center gap-2 overflow-hidden py-1">
        {[82, 78, 66, 122, 88].map((width, i) => (
          <div
            key={i}
            style={{ width }}
            className="h-8 shrink-0 animate-pulse rounded-full bg-interlink-surface border border-interlink-border/60"
          />
        ))}
      </div>

      {/* Reel card skeleton */}
      <div className="overflow-hidden rounded-3xl border border-interlink-border bg-interlink-surface shadow-subtle">
        <div className="relative aspect-[4/5] max-h-[460px] w-full animate-pulse bg-interlink-border/35">
          <div className="flex items-center justify-between p-4">
            <PulseBlock className="h-6 w-24 rounded-full" />
            <PulseBlock className="h-6 w-12 rounded-full" />
          </div>
          <div className="absolute bottom-4 left-4 right-16 space-y-2">
            <PulseBlock className="h-4 w-40 rounded-full" />
            <PulseBlock className="h-5 w-64 rounded-lg" />
            <PulseBlock className="h-3 w-48 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <PulseBlock className="h-3.5 w-32 rounded-full" />
          <PulseBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>

      {/* Mentor spotlight card skeleton */}
      <div className="rounded-3xl border border-interlink-border bg-interlink-surface p-4 shadow-subtle">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PulseBlock className="h-11 w-11 rounded-full" />
            <div className="space-y-1.5">
              <PulseBlock className="h-4 w-32 rounded-full" />
              <PulseBlock className="h-3 w-44 rounded-full" />
            </div>
          </div>
          <PulseBlock className="h-8 w-20 rounded-full" />
        </div>
        <div className="mt-4 space-y-2 rounded-2xl bg-interlink-app-bg p-4">
          <PulseBlock className="h-3.5 w-full rounded-full" />
          <PulseBlock className="h-3.5 w-5/6 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function MentorshipsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <PulseBlock className="h-11 w-11 rounded-full" />
              <div className="space-y-2">
                <PulseBlock className="h-2.5 w-14 rounded-full" />
                <PulseBlock className="h-4 w-36 rounded-full" />
              </div>
            </div>
            <PulseBlock className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <PulseBlock className="h-3.5 w-full rounded-full" />
            <PulseBlock className="h-3.5 w-2/3 rounded-full" />
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-interlink-border/60 pt-4">
            <PulseBlock className="h-3 w-24 rounded-full" />
            <div className="flex gap-2">
              <PulseBlock className="h-7 w-14 rounded-full" />
              <PulseBlock className="h-7 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MentorshipWorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PulseBlock className="h-6 w-52 rounded-lg" />
              <PulseBlock className="h-5 w-16 rounded-full" />
            </div>
            <PulseBlock className="h-3 w-40 rounded-full" />
          </div>
          <div className="flex gap-2">
            <PulseBlock className="h-8 w-32 rounded-full" />
            <PulseBlock className="h-8 w-36 rounded-full" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-interlink-border/60 pt-4">
          {[90, 88, 96, 108, 100].map((w, i) => (
            <div key={i} style={{ width: w }} className="h-8 animate-pulse rounded-full bg-interlink-app-bg" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-64 animate-pulse rounded-2xl border border-interlink-border bg-interlink-surface lg:col-span-7" />
        <div className="h-64 animate-pulse rounded-2xl border border-interlink-border bg-interlink-surface lg:col-span-5" />
      </div>
    </div>
  );
}

export function MessagesListSkeleton() {
  return (
    <div
      className="h-[calc(100dvh-4.25rem-4.75rem-env(safe-area-inset-bottom))] min-h-[460px] overflow-hidden bg-[#0c110f] sm:rounded-3xl sm:ring-1 sm:ring-white/[0.08] lg:grid lg:h-[calc(100vh-11rem)] lg:min-h-[540px] lg:max-h-[820px] lg:grid-cols-12"
      aria-busy="true"
      aria-label="Loading messages"
    >
      {/* Left inbox column */}
      <div className="flex flex-col border-white/[0.07] p-3.5 sm:p-4 lg:col-span-4 lg:border-r">
        <div className="flex items-center justify-between pb-3">
          <div className="h-5 w-24 animate-pulse rounded-lg bg-white/10" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl p-2.5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/[0.07]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop active chat skeleton pane */}
      <div className="hidden flex-col justify-between lg:col-span-8 lg:flex">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-white/[0.07]" />
          </div>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-end gap-2.5">
            <div className="h-10 w-60 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
            <div className="h-16 w-72 animate-pulse rounded-2xl bg-white/[0.07]" />
          </div>
        </div>
        <div className="px-5 pb-4">
          <div className="h-24 w-full animate-pulse rounded-[20px] bg-white/[0.07]" />
        </div>
      </div>
    </div>
  );
}

export function NotificationsListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex justify-end">
        <PulseBlock className="h-8 w-32 rounded-full" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <PulseBlock className="h-4 w-44 rounded-full" />
              <PulseBlock className="h-4 w-12 rounded-full" />
            </div>
            <PulseBlock className="h-3.5 w-4/5 rounded-full" />
            <PulseBlock className="h-3 w-28 rounded-full" />
          </div>
          <PulseBlock className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function RequestsListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <PulseBlock className="h-5 w-52 rounded-full" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PulseBlock className="h-4 w-36 rounded-full" />
                <PulseBlock className="h-5 w-20 rounded-full" />
              </div>
              <PulseBlock className="h-3 w-48 rounded-full" />
            </div>
            <div className="flex gap-2">
              <PulseBlock className="h-8 w-20 rounded-full" />
              <PulseBlock className="h-8 w-24 rounded-full" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <PulseBlock className="h-3.5 w-full rounded-full" />
            <PulseBlock className="h-3.5 w-4/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GoalsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="flex items-start justify-between gap-2">
            <PulseBlock className="h-5 w-44 rounded-full" />
            <PulseBlock className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-3 space-y-2">
            <PulseBlock className="h-3.5 w-full rounded-full" />
            <PulseBlock className="h-3.5 w-3/4 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <PulseBlock className="h-3 w-32 rounded-full" />
              <PulseBlock className="h-3 w-10 rounded-full" />
            </div>
            <PulseBlock className="h-2 w-full rounded-full" />
          </div>
          <div className="mt-4 border-t border-interlink-border/60 pt-3">
            <PulseBlock className="h-3 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SessionsListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PulseBlock className="h-4 w-48 rounded-full" />
              <PulseBlock className="h-5 w-20 rounded-full" />
            </div>
            <PulseBlock className="h-3 w-56 rounded-full" />
          </div>
          <PulseBlock className="h-8 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SavedMentorsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="flex items-start justify-between gap-2">
            <PulseBlock className="h-4 w-32 rounded-full" />
            <PulseBlock className="h-5 w-16 rounded-full" />
          </div>
          <PulseBlock className="mt-2 h-3 w-44 rounded-full" />
          <div className="mt-5 border-t border-interlink-border/60 pt-3">
            <PulseBlock className="h-3.5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileEditorSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true">
      {/* Header summary card */}
      <div className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PulseBlock className="h-16 w-16 rounded-full" />
            <PulseBlock className="h-9 w-32 rounded-full" />
          </div>
          <div className="w-full space-y-2 sm:max-w-[240px]">
            <div className="flex justify-between">
              <PulseBlock className="h-3 w-24 rounded-full" />
              <PulseBlock className="h-3 w-8 rounded-full" />
            </div>
            <PulseBlock className="h-2 w-full rounded-full" />
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-hidden border-t border-interlink-border/60 pt-4">
          {[76, 120, 130, 145].map((w, i) => (
            <div key={i} style={{ width: w }} className="h-7 shrink-0 animate-pulse rounded-full bg-interlink-app-bg" />
          ))}
        </div>
      </div>

      {/* Category cards */}
      {[0, 1].map((card) => (
        <div
          key={card}
          className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle space-y-4"
        >
          <PulseBlock className="h-4 w-40 rounded-full" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PulseBlock className="h-11 w-full rounded-xl" />
            <PulseBlock className="h-11 w-full rounded-xl" />
          </div>
          <PulseBlock className="h-24 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle space-y-4">
        <PulseBlock className="h-5 w-40 rounded-full" />
        <div className="flex items-center gap-4">
          <PulseBlock className="h-16 w-16 rounded-full" />
          <PulseBlock className="h-9 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PulseBlock className="h-11 w-full rounded-xl" />
          <PulseBlock className="h-11 w-full rounded-xl" />
        </div>
        <PulseBlock className="h-9 w-40 rounded-full" />
      </div>

      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl border border-interlink-border bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="space-y-2">
            <PulseBlock className="h-4 w-36 rounded-full" />
            <PulseBlock className="h-3 w-56 rounded-full" />
          </div>
          <PulseBlock className="h-9 w-36 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function MentorCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading mentors"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative flex min-h-[345px] flex-col justify-between overflow-hidden rounded-3xl bg-interlink-surface p-4 shadow-subtle sm:min-h-[370px]"
        >
          {/* Top bar: Experience pill + Bookmark/Compare icons */}
          <div className="flex items-center justify-between gap-2">
            <PulseBlock className="h-6 w-20 rounded-full" />
            <div className="flex items-center gap-1.5">
              <PulseBlock className="h-8 w-8 rounded-full" />
              <PulseBlock className="h-8 w-8 rounded-full" />
            </div>
          </div>

          {/* Bottom overlay stack matching card content */}
          <div className="space-y-2.5 pt-24 sm:pt-28">
            <div className="flex items-center gap-2">
              <PulseBlock className="h-5 w-36 rounded-lg" />
              <PulseBlock className="h-5 w-5 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <PulseBlock className="h-3.5 w-32 rounded-full" />
              <PulseBlock className="h-3.5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <PulseBlock className="h-3 w-full rounded-full" />
              <PulseBlock className="h-3 w-4/5 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-3 pt-1.5">
              <div className="flex items-center gap-3">
                <PulseBlock className="h-3.5 w-8 rounded-full" />
                <PulseBlock className="h-3.5 w-20 rounded-full" />
              </div>
              <PulseBlock className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MentorDirectoryContentSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading mentor directory">
      {/* Search, filter toggle & quick industry pill strip */}
      <div className="rounded-2xl border border-interlink-border/80 bg-interlink-surface p-5 shadow-subtle sm:p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <PulseBlock className="h-10 w-full rounded-xl md:col-span-7" />
            <PulseBlock className="h-10 w-full rounded-xl md:col-span-3" />
            <PulseBlock className="h-10 w-full rounded-xl md:col-span-2" />
          </div>

          <div className="no-scrollbar flex items-center gap-2 overflow-hidden pb-1">
            {[96, 108, 92, 112, 88].map((w, i) => (
              <div
                key={i}
                style={{ width: w }}
                className="h-7 shrink-0 animate-pulse rounded-full bg-interlink-app-bg"
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-interlink-border/40 pt-3">
            <PulseBlock className="h-3.5 w-28 rounded-full" />
          </div>
        </div>
      </div>

      <MentorCardGridSkeleton count={6} />
    </div>
  );
}

export function MentorsDirectorySkeleton() {
  return (
    <div className="min-h-screen bg-interlink-app-bg" aria-busy="true">
      {/* Hero Skeleton matching InteractiveMatteHero py-12 sm:py-14 */}
      <div className="border-b border-interlink-border/50 bg-interlink-surface py-12 sm:py-14">
        <div className="mx-auto max-w-[1360px] space-y-2.5 px-6 sm:px-10">
          <PulseBlock className="h-3 w-28 rounded-full" />
          <PulseBlock className="h-8 w-52 rounded-lg" />
          <PulseBlock className="h-4 w-96 max-w-full rounded-full" />
        </div>
      </div>

      {/* Directory Content Skeleton matching py-10 container */}
      <div className="py-10">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <MentorDirectoryContentSkeleton />
        </div>
      </div>
    </div>
  );
}
