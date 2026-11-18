import React from "react";
import type { SessionUser } from "@interlink/types";
import { AuthModalProvider } from "@/features/auth/ui/AuthModalProvider";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";
import { PWAPublicShellAdapter } from "./PWAPublicShellAdapter";

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
