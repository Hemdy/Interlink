import React from "react";
import type { SessionUser } from "@interlink/types";
import { AuthModalProvider } from "@/features/auth/ui/AuthModalProvider";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

export function PublicShell({
  user,
  children,
  showFooter = true,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  return (
    <AuthModalProvider initialUser={user}>
      <div className="flex min-h-screen flex-col bg-interlink-canvas text-interlink-ink">
        <PublicHeader user={user} />
        <div className="flex-1">{children}</div>
        {showFooter && <PublicFooter />}
      </div>
    </AuthModalProvider>
  );
}
