import { notFound, redirect } from "next/navigation";
import { getPublishedPlatformEventById } from "@/features/content/infrastructure/contentQueries";
import { hasExtendedEventDetails } from "@/features/events/domain/eventDetails";
import { EventDetailsClient } from "@/features/events/ui/EventDetailsClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const event = await getPublishedPlatformEventById(id);

  if (!event || !hasExtendedEventDetails(event)) {
    notFound();
  }

  return <EventDetailsClient event={event} user={user} />;
}
