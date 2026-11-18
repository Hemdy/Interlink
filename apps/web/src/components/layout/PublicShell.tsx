import React, { Suspense } from "react";
import type { SessionUser } from "@interlink/types";
import { AuthModalProvider } from "@/features/auth/ui/AuthModalProvider";
import { SessionSyncGuard } from "@/features/auth/ui/SessionSyncGuard";
import { getCurrentUser } from "@/lib/auth/session";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";
import { PWAPublicShellAdapter } from "./PWAPublicShellAdapter";

async function AsyncPublicHeader() {
  const user = await getCurrentUser();
  return <PublicHeader user={user} />;
}

async function AsyncPWAShellSyncChrome() {
  const user = await getCurrentUser();
  return (
    <>
      <SessionSyncGuard expectedUserId={user?.id ?? null} />
      {user && (
        <PWAPublicShellAdapter
          user={user}
          header={null}
          footer={null}
          chromeOnly
        >
          {null}
        </PWAPublicShellAdapter>
      )}
    </>
  );
}

export function PublicShell({
  user,
  children,
  showFooter = true,
}: {
  user?: SessionUser | null;
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  if (user !== undefined) {
    return (
      <AuthModalProvider initialUser={user}>
        <PWAPublicShellAdapter
          user={user}
          header={<PublicHeader user={user} />}
          footer={showFooter ? <PublicFooter /> : null}
        >
          {children}
        </PWAPublicShellAdapter>
      </AuthModalProvider>
    );
  }

  return (
    <AuthModalProvider>
      <div className="flex min-h-screen flex-col bg-interlink-canvas text-interlink-ink">
        <Suspense fallback={<PublicHeader user={null} />}>
          <AsyncPublicHeader />
        </Suspense>
        <div className="flex-1">{children}</div>
        {showFooter ? <PublicFooter /> : null}
        <Suspense fallback={null}>
          <AsyncPWAShellSyncChrome />
        </Suspense>
      </div>
    </AuthModalProvider>
  );
}
