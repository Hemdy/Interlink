"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Info, Sparkles } from "lucide-react";
import type { MembershipTier, SessionUser } from "@interlink/types";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

interface MembershipCounts {
  free: number;
  plus: number;
  pro: number;
}

const TIERS: Array<{
  id: MembershipTier;
  name: string;
  priceLabel: string;
  badgeText: string;
  badgeTone: "forest" | "gold" | "info";
  accentBorderClass: string;
  description: string;
  features: string[];
}> = [
  {
    id: "free",
    name: "Free",
    priceLabel: "₦0",
    badgeText: "Active Now",
    badgeTone: "forest",
    accentBorderClass: "border-t-4 border-t-interlink-forest",
    description:
      "Core community participation, professional profile, and free mentorship remain open to everyone.",
    features: [
      "Basic professional profile",
      "Community participation",
      "Access to free mentorship",
      "Basic mentor discovery",
    ],
  },
  {
    id: "plus",
    name: "Interlink Plus",
    priceLabel: "₦2,500",
    badgeText: "Proposed Tier",
    badgeTone: "gold",
    accentBorderClass: "border-t-4 border-t-interlink-gold",
    description:
      "Accelerated mentorship matching, guided roadmaps, and curated career workshops.",
    features: [
      "Advanced mentor discovery and matching",
      "Priority mentorship requests",
      "Exclusive professional communities",
      "Career development roadmaps",
      "Career resources and premium workshops",
      "Access to selected industry events",
    ],
  },
  {
    id: "pro",
    name: "Interlink Pro",
    priceLabel: "₦5,000",
    badgeText: "Proposed Tier",
    badgeTone: "info",
    accentBorderClass: "border-t-4 border-t-sky-500",
    description:
      "Full suite of career acceleration tools, priority support, and executive services.",
    features: [
      "Everything in Interlink Plus",
      "More advanced career development resources",
      "Priority support",
      "Additional premium professional services",
    ],
  },
];

export function MembershipClient({
  user,
  initialCounts,
  initialUserTier,
}: {
  user: SessionUser | null;
  initialCounts: MembershipCounts;
  initialUserTier: string | null;
}) {
  const { pushToast } = useToast();
  const [counts, setCounts] = useState<MembershipCounts>(initialCounts);
  const [userTier, setUserTier] = useState<string | null>(initialUserTier);
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
  const [fullName, setFullName] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : "",
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleValidateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTier) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/membership-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          fullName,
          email,
          notes: notes || null,
        }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        pushToast({ kind: "error", title: json.error?.message ?? "Unable to record interest" });
        return;
      }

      if (userTier !== selectedTier) {
        setCounts((prev) => ({
          ...prev,
          [selectedTier]: prev[selectedTier] + 1,
        }));
      }
      setUserTier(selectedTier);
      setSelectedTier(null);
      setNotes("");
      pushToast({
        kind: "success",
        title: "Feedback & early access recorded",
        description: `We noted your interest in Interlink ${selectedTier === "plus" ? "Plus" : selectedTier === "pro" ? "Pro" : "Free"}.`,
      });
    } catch {
      pushToast({ kind: "error", title: "Network error submitting validation feedback" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-8 rounded-2xl border border-interlink-gold/40 bg-interlink-gold/[0.08] p-4 text-xs text-interlink-ink">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-interlink-gold" />
          <p className="leading-relaxed">
            <strong>Community-First Rollout:</strong> Basic community participation, professional
            profiles, and access to free mentorship remain <strong>₦0/month</strong> for everyone.{" "}
            <strong>Interlink Plus</strong> and <strong>Interlink Pro</strong> are proposed pricing
            tiers open for user validation before paid subscriptions launch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const isSelectedByUser = userTier === tier.id;
          const totalInterest = counts[tier.id];
          return (
            <Card
              key={tier.id}
              elevated
              className={`flex flex-col justify-between ${tier.accentBorderClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold text-interlink-ink">
                    {tier.name}
                  </h2>
                  <Badge tone={tier.badgeTone}>{tier.badgeText}</Badge>
                </div>

                <p className="mt-3 text-3xl font-light text-interlink-ink">
                  <span className={tier.id === "free" ? "text-interlink-forest" : ""}>
                    {tier.priceLabel}
                  </span>{" "}
                  <span className="text-xs text-interlink-muted">/ month</span>
                </p>

                <p className="mt-2 text-sm text-interlink-muted">{tier.description}</p>

                <ul className="mt-6 space-y-3 text-sm text-interlink-ink/85">
                  {tier.features.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-interlink-forest" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 space-y-2.5">
                {tier.id === "free" ? (
                  <Link
                    href={user ? "/mentors" : "/sign-up"}
                    className="block w-full rounded-full bg-interlink-forest py-2.5 text-center text-sm font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
                  >
                    {user ? "Browse Free Mentors" : "Get Started Free"}
                  </Link>
                ) : (
                  <Button
                    variant={tier.id === "plus" ? "primary" : "outline"}
                    className="w-full rounded-full"
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    {isSelectedByUser
                      ? "Interest Recorded ✓"
                      : `Validate ${tier.name} Interest`}
                  </Button>
                )}

                {tier.id !== "free" && totalInterest > 0 && (
                  <p className="text-center text-[11px] text-interlink-muted">
                    {totalInterest} {totalInterest === 1 ? "member" : "members"} validated interest
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Paid Marketplace Commission & Institutional Partnerships Overview */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card elevated>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-interlink-forest" />
            <div>
              <h3 className="text-sm font-semibold text-interlink-ink">
                Paid &amp; Free Mentorship Marketplace (85% / 15% Split)
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-interlink-muted">
                Mentors can configure free mentorship alongside hourly, per-session, or monthly
                paid packages from their{" "}
                <Link href="/profile#profile-pricing" className="font-semibold text-interlink-forest hover:underline">
                  Profile Settings
                </Link>
                . Mentors keep 85% of completed paid bookings with a 15% Interlink platform fee.
              </p>
            </div>
          </div>
        </Card>

        <Card elevated>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-interlink-gold" />
            <div>
              <h3 className="text-sm font-semibold text-interlink-ink">
                Institutional &amp; University Ecosystem (Roadmap Phase 2)
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-interlink-muted">
                Universities, companies, and professional communities will be able to run graduate
                mentorship cohorts, early-career development programmes, sponsored opportunities,
                and industry events with cohort reporting.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(selectedTier)}
        onClose={() => setSelectedTier(null)}
        title="Validate Membership Interest"
        maxWidthClass="max-w-md"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h3 className="font-display text-lg font-semibold text-interlink-ink">
            {selectedTier === "pro"
              ? "Interlink Pro — ₦5,000/month"
              : "Interlink Plus — ₦2,500/month"}
          </h3>
          <p className="mt-1 text-xs text-interlink-muted">
            No charge now. Let us know what value matters most to you before subscriptions launch.
          </p>

          <form onSubmit={handleValidateSubmit} className="mt-4 space-y-3.5">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Textarea
              label="Which feature would motivate you most? (Optional)"
              placeholder="e.g., Career roadmaps, priority mentor requests, or workshops..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedTier(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Submit Interest
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
