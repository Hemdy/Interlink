import React from "react";
import type { SessionUser } from "@interlink/types";
import { AuthModalProvider } from "@/features/auth/ui/AuthModalProvider";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";
import { PWAPublicShellAdapter } from "./PWAPublicShellAdapter";

export async function PublicShell({
  user,
  children,
  showFooter = true,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <AuthModalProvider initialUser={user}>
      <PWAPublicShellAdapter
        user={user}
        unreadCount={unreadCount}
        header={<PublicHeader user={user} />}
        footer={showFooter ? <PublicFooter /> : null}
      >
        {children}
      </PWAPublicShellAdapter>
    </AuthModalProvider>
  );
}
