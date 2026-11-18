import React, { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

async function ResolvedSessionLink({
  authedHref,
  authedLabel,
  guestHref,
  guestLabel,
  className,
}: {
  authedHref: string;
  authedLabel: string;
  guestHref: string;
  guestLabel: string;
  className: string;
}) {
  const user = await getCurrentUser();
  return (
    <Link href={user ? authedHref : guestHref} className={className}>
      {user ? authedLabel : guestLabel}
    </Link>
  );
}

/**
 * Streams a session-aware CTA link without blocking parent hero HTML delivery.
 */
export function SessionLink(props: {
  authedHref: string;
  authedLabel: string;
  guestHref: string;
  guestLabel: string;
  className: string;
}) {
  return (
    <Suspense
      fallback={
        <Link href={props.guestHref} className={props.className}>
          {props.guestLabel}
        </Link>
      }
    >
      <ResolvedSessionLink {...props} />
    </Suspense>
  );
}
