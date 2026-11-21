import type { PlatformEventItem } from "@interlink/types";

/**
 * Determines whether an event, advertisement, or promotion has additional
 * details beyond a compact summary card (triggering a dedicated /events/[id] page).
 */
export function hasExtendedEventDetails(event: PlatformEventItem): boolean {
  return (
    event.summary.trim().length > 110 ||
    Boolean(event.eventDate) ||
    Boolean(event.ctaUrl)
  );
}
