import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import { getDb, isDatabaseConfigured, mentorships, users } from "@interlink/database";
import { formatDate } from "@interlink/utils";
import { ChevronRight } from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MentorshipsListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = isDatabaseConfigured() ? getDb() : null;

  const rows = db
    ? await db
        .select()
        .from(mentorships)
        .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
        .orderBy(desc(mentorships.lastActivityAt))
    : [];

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.mentorId, r.menteeId])));
  const relatedUsers =
    db && userIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: users.profileImage,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          title="No mentorship relationships yet"
          description="Once a mentorship request is accepted, your dedicated workspace with goals, sessions, and private messaging opens here."
          action={
            <Link
              href="/mentors"
              className="inline-flex items-center rounded-full bg-interlink-forest px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
            >
              Browse Mentors
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {rows.map((m) => {
            const partnerId = m.mentorId === user.id ? m.menteeId : m.mentorId;
            const partner = userMap.get(partnerId);
            const roleLabel = m.mentorId === user.id ? "Mentee" : "Mentor";
            return (
              <Link
                key={m.id}
                href={`/mentorships/${m.id}`}
                className="group block rounded-2xl focus-ring"
              >
                <Card className="flex h-full flex-col justify-between transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <UserAvatar
                            src={partner?.profileImage}
                            firstName={partner?.firstName ?? "P"}
                            lastName={partner?.lastName ?? ""}
                            size="md"
                          />
                          {m.status === "active" && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-interlink-surface" />
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-interlink-muted">
                            {roleLabel}
                          </p>
                          <h2 className="mt-0.5 font-display text-lg font-semibold text-interlink-ink transition-colors group-hover:text-interlink-forest">
                            {partner ? `${partner.firstName} ${partner.lastName}` : "Participant"}
                          </h2>
                        </div>
                      </div>
                      <Badge
                        tone={
                          m.status === "active"
                            ? "forest"
                            : m.status === "completed"
                              ? "info"
                              : "warning"
                        }
                      >
                        {m.status}
                      </Badge>
                    </div>

                    {m.agreedExpectations && (
                      <p className="mt-3 line-clamp-2 text-sm text-interlink-muted">
                        {m.agreedExpectations}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between pt-2 text-xs text-interlink-muted">
                    <span>Started {formatDate(m.startDate)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-interlink-forest transition-transform group-hover:translate-x-0.5">
                      Open details <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
