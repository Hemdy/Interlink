import React from "react";
import Link from "next/link";
import { ArrowRight, Award, Flame, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";

interface MomentumBannerProps {
  firstName: string;
  role: "mentor" | "mentee";
  profileCompletion: number;
  activeConnections: number;
  completedSessions: number;
  goalsCount: number;
  pendingRequestsCount: number;
  verificationStatus?: string;
  primaryAction: {
    label: string;
    href: string;
  };
}

export function SocialMomentumBanner({
  firstName,
  role,
  profileCompletion,
  activeConnections,
  completedSessions,
  goalsCount,
  pendingRequestsCount,
  verificationStatus,
  primaryAction,
}: MomentumBannerProps) {
  const rawScore =
    Math.round(profileCompletion * 0.35) +
    activeConnections * 25 +
    completedSessions * 15 +
    goalsCount * 10 +
    (verificationStatus === "verified" ? 20 : 0);

  const progressPercent = Math.min(100, Math.max(12, rawScore));
  const level =
    rawScore >= 90
      ? { title: "Trailblazer", step: 4 }
      : rawScore >= 60
        ? { title: "Connector", step: 3 }
        : rawScore >= 30
          ? { title: "Builder", step: 2 }
          : { title: "Explorer", step: 1 };

  const streakCount = Math.max(1, completedSessions + activeConnections);

  const achievements = [
    {
      label: "Profile Ready",
      unlocked: profileCompletion >= 80,
      icon: Sparkles,
    },
    {
      label: "First Match",
      unlocked: activeConnections >= 1,
      icon: Zap,
    },
    role === "mentor"
      ? {
          label: "Verified Guide",
          unlocked: verificationStatus === "verified",
          icon: ShieldCheck,
        }
      : {
          label: "Goal Setter",
          unlocked: goalsCount >= 1,
          icon: Target,
        },
    {
      label: "Session Streak",
      unlocked: completedSessions >= 1,
      icon: Award,
    },
  ];

  const nextHint =
    profileCompletion < 80
      ? `Complete your profile (${profileCompletion}%) to boost your discovery visibility.`
      : role === "mentor" && pendingRequestsCount > 0
        ? `You have ${pendingRequestsCount} awaiting request${pendingRequestsCount === 1 ? "" : "s"} from aspiring mentees.`
        : role === "mentee" && activeConnections === 0
          ? "Connect with a mentor or RSVP to a community event to level up."
          : "Keep your momentum going with regular check-ins and sessions.";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-interlink-border/80 bg-gradient-to-br from-interlink-surface via-interlink-surface to-interlink-forest/[0.06] p-5 shadow-elevated sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-interlink-forest/12 px-3 py-1 text-xs font-semibold text-interlink-forest dark:bg-interlink-forest/25 dark:text-emerald-300">
              <Flame className="h-3.5 w-3.5 text-interlink-gold" aria-hidden="true" />
              {streakCount}x Momentum
            </span>
            <span className="inline-flex items-center rounded-full border border-interlink-border bg-interlink-app-bg px-2.5 py-0.5 text-[11px] font-semibold text-interlink-ink">
              Level {level.step} &middot; {level.title}
            </span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-interlink-ink sm:text-[28px]">
              Hey {firstName}, ready to connect?
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-interlink-muted sm:text-sm">
              {nextHint}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-interlink-muted">
              <span>Journey progress</span>
              <span className="font-semibold text-interlink-forest">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-interlink-border/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-interlink-forest to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {achievements.map((badge) => {
              const Icon = badge.icon;
              return (
                <span
                  key={badge.label}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    badge.unlocked
                      ? "border-interlink-forest/30 bg-interlink-forest/10 text-interlink-forest dark:bg-interlink-forest/25 dark:text-emerald-300"
                      : "border-interlink-border/70 bg-interlink-app-bg/60 text-interlink-muted/75"
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{badge.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Single Clear Primary Action */}
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {profileCompletion < 80 && (
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-full border border-interlink-hairline bg-interlink-surface px-4 py-2.5 text-xs font-semibold text-interlink-ink shadow-subtle transition-all hover:border-interlink-forest hover:text-interlink-forest active:scale-[0.97]"
            >
              Finish Profile
            </Link>
          )}
          <Link
            href={primaryAction.href}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-interlink-forest px-5 py-2.5 text-xs font-semibold text-white shadow-elevated transition-all hover:bg-interlink-forest-hover active:scale-[0.97] sm:text-sm"
          >
            <span>{primaryAction.label}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
