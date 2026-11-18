"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import dynamic from "next/dynamic";
import type { SessionUser } from "@interlink/types";
import type { AuthModalView } from "./AuthModalsLazy";

const AuthModalsLazy = dynamic(() => import("./AuthModalsLazy"), {
  ssr: false,
});

interface AuthModalContextValue {
  openSignIn: () => void;
  openSignUp: (defaultRole?: "mentee" | "mentor") => void;
  openForgotPassword: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used inside AuthModalProvider");
  }
  return ctx;
}

export function AuthModalProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const [view, setView] = useState<AuthModalView>(null);
  const [role, setRole] = useState<"mentee" | "mentor">("mentee");

  const openSignIn = useCallback(() => {
    setView("sign-in");
  }, []);

  const openSignUp = useCallback((defaultRole: "mentee" | "mentor" = "mentee") => {
    setRole(defaultRole);
    setView("sign-up");
  }, []);

  const openForgotPassword = useCallback(() => {
    setView("forgot-password");
  }, []);

  const closeAuthModal = useCallback(() => {
    setView(null);
  }, []);

  void initialUser;

  return (
    <AuthModalContext.Provider
      value={{ openSignIn, openSignUp, openForgotPassword, closeAuthModal }}
    >
      {children}
      {view !== null && (
        <AuthModalsLazy
          view={view}
          setView={setView}
          role={role}
          setRole={setRole}
          closeAuthModal={closeAuthModal}
        />
      )}
    </AuthModalContext.Provider>
  );
}
