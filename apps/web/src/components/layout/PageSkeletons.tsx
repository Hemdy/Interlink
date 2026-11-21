import React from "react";

function PulseBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-interlink-border/55 ${className}`} />;
}

export function DashboardFeedSkeleton() {
  return (
    <div
      className="-mx-4 -my-6 min-h-screen bg-[#0a1a12] px-4 py-6 sm:-mx-8 sm:-my-8 sm:px-8 sm:py-8"
      aria-busy="true"
      aria-label="Loading feed"
    >
      <div className="mx-auto max-w-[680px] space-y-5">
        {/* Story rings strip (Create Post + mentors) */}
        <div className="no-scrollbar flex items-center gap-3.5 overflow-hidden pb-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
              <div className="h-14 w-14 animate-pulse rounded-full bg-[#163425]" />
              <div className="h-2.5 w-10 animate-pulse rounded-full bg-[#163425]" />
            </div>
          ))}
        </div>

        {/* Sticky borderless filter pills row */}
        <div className="no-scrollbar flex items-center gap-2 overflow-hidden py-1">
          {[76, 82, 66, 122, 88, 70].map((width, i) => (
            <div
              key={i}
              style={{ width }}
              className="h-8 shrink-0 animate-pulse rounded-full bg-[#122a1d]"
            />
          ))}
        </div>

        {/* Full-screen vertical TikTok/Reels video card skeleton */}
        <div className="-mx-4 overflow-hidden bg-[#07130d] sm:mx-auto sm:max-w-[460px] sm:rounded-3xl">
          {/* Top card action buttons strip */}
          <div className="flex items-center justify-between bg-[#0d2117] px-4 py-2.5">
            <div className="flex items-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-7 animate-pulse rounded-full bg-[#163425]" />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#163425]" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#163425]" />
            </div>
          </div>

          <div className="relative h-[calc(100dvh-148px)] min-h-[520px] max-h-[820px] w-full animate-pulse bg-[#0d2117] sm:h-[min(82dvh,760px)]">
            <div className="flex items-center justify-between p-4">
              <div className="h-6 w-24 rounded-full bg-[#163425]" />
              <div className="h-8 w-8 rounded-full bg-[#163425]" />
            </div>

            {/* Bottom creator overlay */}
            <div className="absolute bottom-12 left-4 right-4 space-y-2 sm:bottom-5">
              <div className="h-4 w-36 rounded-full bg-[#163425]" />
              <div className="h-5 w-60 rounded-lg bg-[#163425]" />
              <div className="h-3 w-48 rounded-full bg-[#163425]" />
            </div>
          </div>
        </div>

        {/* Mentor Discovery horizontal swipeable row skeleton (max 4 per view group) */}
        <div className="rounded-3xl bg-[#10261b] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 animate-pulse rounded-full bg-[#163425]" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 animate-pulse rounded-full bg-[#163425]" />
                <div className="h-2.5 w-48 animate-pulse rounded-full bg-[#163425]" />
              </div>
            </div>
            <div className="h-3.5 w-10 animate-pulse rounded-full bg-[#163425]" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl bg-[#163425] p-3.5"
              >
                <div className="h-14 w-14 animate-pulse rounded-full bg-[#1d422f]" />
                <div className="mt-2.5 h-3 w-24 animate-pulse rounded-full bg-[#1d422f]" />
                <div className="mt-1.5 h-3 w-28 animate-pulse rounded-full bg-[#1d422f]" />
                <div className="mt-3 h-7 w-full animate-pulse rounded-full bg-[#1d422f]" />
              </div>
            ))}
          </div>
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
          className="rounded-2xl bg-interlink-surface p-5 shadow-subtle"
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
          <div className="mt-5 flex items-center justify-between pt-2">
            <PulseBlock className="h-3 w-24 rounded-full" />
            <PulseBlock className="h-3.5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MentorshipWorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="rounded-2xl bg-interlink-surface p-5 shadow-subtle">
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
        <div className="h-64 animate-pulse rounded-2xl bg-interlink-surface lg:col-span-7" />
        <div className="h-64 animate-pulse rounded-2xl bg-interlink-surface lg:col-span-5" />
      </div>
    </div>
  );
}

export function MessagesListSkeleton() {
  return (
    <div
      className="min-h-0 w-full flex-1 overflow-hidden bg-[#f6f8f7] dark:bg-[#0f1613] lg:grid lg:h-[100dvh] lg:grid-cols-12"
      aria-busy="true"
      aria-label="Loading messages"
    >
      {/* Left inbox column */}
      <div className="flex flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] dark:lg:bg-[#0f1613]/90 sm:px-5 lg:col-span-4">
        <div className="flex items-center justify-between pb-3">
          <div className="h-5 w-24 animate-pulse rounded-lg bg-interlink-border/55 dark:bg-[#19241f]" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-full bg-interlink-border/40 dark:bg-[#141d19]" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-interlink-border/35 dark:bg-[#141d19]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop active chat skeleton pane */}
      <div className="hidden flex-col justify-between lg:col-span-8 lg:flex">
        <div className="flex items-center gap-3 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="h-9 w-9 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-interlink-border/35 dark:bg-[#141d19]" />
          </div>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-end gap-2.5">
            <div className="h-10 w-60 animate-pulse rounded-2xl bg-interlink-border/55 dark:bg-[#19241f]" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
          </div>
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 animate-pulse rounded-full bg-interlink-border/55 dark:bg-[#19241f]" />
            <div className="h-16 w-72 animate-pulse rounded-2xl bg-interlink-border/40 dark:bg-[#141d19]" />
          </div>
        </div>
        <div className="px-5 pb-4">
          <div className="h-20 w-full animate-pulse rounded-[20px] bg-interlink-border/40 dark:bg-[#141d19]" />
        </div>
      </div>
    </div>
  );
}

export function NotificationsListSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10" aria-busy="true" aria-label="Loading notifications">
      <div className="space-y-2.5">
        <PulseBlock className="h-3.5 w-16 rounded-full" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-2xl bg-interlink-surface px-3.5 py-3 shadow-subtle"
          >
            <PulseBlock className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <PulseBlock className="h-4 w-44 rounded-full" />
                <PulseBlock className="h-3 w-12 rounded-full" />
              </div>
              <PulseBlock className="h-3 w-3/4 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        <PulseBlock className="h-3.5 w-20 rounded-full" />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-2xl bg-interlink-surface px-3.5 py-3 shadow-subtle"
          >
            <PulseBlock className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <PulseBlock className="h-4 w-40 rounded-full" />
                <PulseBlock className="h-3 w-12 rounded-full" />
              </div>
              <PulseBlock className="h-3 w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <PulseBlock className="h-11 w-44 rounded-full" />
      </div>
    </div>
  );
}

export function RequestsListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading requests">
      {/* Summary Header & Segmented Tabs Card */}
      <div className="rounded-2xl bg-interlink-surface p-5 shadow-subtle sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <PulseBlock className="h-6 w-48 rounded-lg" />
            <PulseBlock className="h-3.5 w-72 max-w-full rounded-full" />
          </div>
          <div className="flex gap-2">
            <PulseBlock className="h-6 w-28 rounded-full" />
            <PulseBlock className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-hidden">
          <PulseBlock className="h-9 w-32 rounded-full" />
          <PulseBlock className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {[0, 1].map((i) => (
        <div
          key={i}
          className="space-y-5 rounded-2xl bg-interlink-surface p-5 shadow-subtle sm:p-6"
        >
          <div className="flex items-start gap-3.5">
            <PulseBlock className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <PulseBlock className="h-5 w-36 rounded-full" />
                <PulseBlock className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex gap-2">
                <PulseBlock className="h-5 w-20 rounded-full" />
                <PulseBlock className="h-5 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-20 animate-pulse rounded-xl bg-interlink-app-bg" />
            <div className="h-20 animate-pulse rounded-xl bg-interlink-app-bg" />
          </div>
          <div className="flex justify-end gap-2">
            <PulseBlock className="h-8 w-20 rounded-full" />
            <PulseBlock className="h-8 w-32 rounded-full" />
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
          className="rounded-2xl bg-interlink-surface p-5 shadow-subtle"
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
          <div className="mt-4 pt-2">
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
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-interlink-surface p-5 shadow-subtle"
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
          className="rounded-2xl bg-interlink-surface p-5 shadow-subtle"
        >
          <div className="flex items-start justify-between gap-2">
            <PulseBlock className="h-4 w-32 rounded-full" />
            <PulseBlock className="h-5 w-16 rounded-full" />
          </div>
          <PulseBlock className="mt-2 h-3 w-44 rounded-full" />
          <div className="mt-5 pt-2">
            <PulseBlock className="h-3.5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileHubSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading profile">
      {/* Profile Header Card Skeleton: Avatar -> Badges -> Name -> Handle/Headline -> Metrics -> Actions */}
      <div className="rounded-2xl bg-interlink-surface p-5 shadow-subtle sm:p-7">
        <div className="flex flex-col items-center text-center">
          <PulseBlock className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <PulseBlock className="h-5 w-16 rounded-full" />
            <PulseBlock className="h-5 w-14 rounded-full" />
          </div>
          <PulseBlock className="mt-2 h-6 w-44 rounded-lg" />
          <div className="mt-2 w-full max-w-xl space-y-3">
            <PulseBlock className="mx-auto h-3.5 w-28 rounded-full" />
            <PulseBlock className="mx-auto h-4 w-56 rounded-full" />
            <div className="mx-auto grid max-w-md grid-cols-4 gap-2 rounded-2xl bg-interlink-app-bg/70 p-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <PulseBlock className="mx-auto h-4 w-8 rounded-full" />
                  <PulseBlock className="mx-auto h-3 w-12 rounded-full" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <PulseBlock className="h-8 w-28 rounded-full" />
              <PulseBlock className="h-8 w-28 rounded-full" />
              <PulseBlock className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Content Tabs Skeleton (Posts, Videos, Articles) */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-interlink-surface p-1.5 shadow-subtle">
        {[0, 1, 2].map((i) => (
          <PulseBlock key={i} className="h-9 w-full rounded-xl" />
        ))}
      </div>

      {/* 3-Column Visual Content Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-interlink-surface shadow-subtle">
            <PulseBlock className="aspect-[4/5] w-full" />
            <div className="space-y-1.5 p-3">
              <PulseBlock className="h-3.5 w-3/4 rounded-full" />
              <PulseBlock className="h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileEditorSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true">
      {/* Header summary card (Avatar + Profile Strength side-by-side) */}
      <div className="rounded-2xl bg-interlink-surface p-5 shadow-subtle">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <PulseBlock className="h-16 w-16 shrink-0 rounded-full" />
          <div className="min-w-[180px] flex-1 max-w-sm space-y-2">
            <div className="flex justify-between">
              <PulseBlock className="h-3 w-24 rounded-full" />
              <PulseBlock className="h-3 w-8 rounded-full" />
            </div>
            <PulseBlock className="h-2 w-full rounded-full" />
            <PulseBlock className="h-3 w-36 rounded-full" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-hidden pt-1">
          {[76, 120, 130, 145].map((w, i) => (
            <div key={i} style={{ width: w }} className="h-7 shrink-0 animate-pulse rounded-full bg-interlink-app-bg" />
          ))}
        </div>
      </div>

      {/* Category cards */}
      {[0, 1].map((card) => (
        <div
          key={card}
          className="rounded-2xl bg-interlink-surface p-5 shadow-subtle space-y-4"
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
      <div className="rounded-2xl bg-interlink-surface p-5 shadow-subtle space-y-4">
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
          className="flex items-center justify-between rounded-2xl bg-interlink-surface p-5 shadow-subtle"
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
      <div className="rounded-2xl bg-interlink-surface p-4 shadow-subtle sm:p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PulseBlock className="h-10 min-w-0 flex-1 rounded-full" />
            <PulseBlock className="h-10 w-24 shrink-0 rounded-full" />
          </div>

          <div className="no-scrollbar flex items-center gap-1.5 overflow-hidden pb-0.5">
            {[96, 108, 92, 112, 88].map((w, i) => (
              <div
                key={i}
                style={{ width: w }}
                className="h-7 shrink-0 animate-pulse rounded-full bg-interlink-app-bg"
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-0.5">
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
