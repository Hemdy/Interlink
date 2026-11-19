"use client";

import React, { createContext, useContext, useEffect } from "react";

interface WorkspaceHeaderContextValue {
  setHeaderActions: (actions: React.ReactNode | null) => void;
}

const WorkspaceHeaderContext = createContext<WorkspaceHeaderContextValue | null>(null);

export function WorkspaceHeaderProvider({
  setHeaderActions,
  children,
}: {
  setHeaderActions: (actions: React.ReactNode | null) => void;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceHeaderContext.Provider value={{ setHeaderActions }}>
      {children}
    </WorkspaceHeaderContext.Provider>
  );
}

/**
 * Registers page-specific top-right header actions inside the persistent AppShell
 * without unmounting or re-initializing the navigation shell on route transitions.
 */
export function WorkspacePageActions({ children }: { children: React.ReactNode }) {
  const ctx = useContext(WorkspaceHeaderContext);
  const setHeaderActions = ctx?.setHeaderActions;

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(children);
    return () => setHeaderActions(null);
  }, [children, setHeaderActions]);

  return null;
}
