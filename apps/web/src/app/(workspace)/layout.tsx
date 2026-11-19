import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const unreadCount = await getUnreadNotificationCount(user.id);

  return (
    <AppShell user={user} unreadCount={unreadCount} title="Interlink">
      {children}
    </AppShell>
  );
}
