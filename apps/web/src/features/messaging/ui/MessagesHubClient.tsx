"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@interlink/utils";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  ConversationChatPanel,
  type ChatMessageItem,
  type ChatParticipant,
} from "./ConversationChatPanel";

export interface ConversationThreadSummary {
  conversationId: string;
  mentorshipId: string;
  mentorshipStatus: string;
  updatedAt: string;
  partner: ChatParticipant | null;
  lastMessage: ChatMessageItem | null;
}

export function MessagesHubClient({
  currentUser,
  initialThreads,
  initialMessagesByConversation,
  initialSelectedId,
  focusedChatMode = false,
}: {
  currentUser: ChatParticipant;
  initialThreads: ConversationThreadSummary[];
  initialMessagesByConversation: Record<string, ChatMessageItem[]>;
  initialSelectedId?: string;
  focusedChatMode?: boolean;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [threads, setThreads] = useState<ConversationThreadSummary[]>(initialThreads);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessageItem[]>>(
    initialMessagesByConversation,
  );
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedId || initialThreads[0]?.conversationId || "",
  );
  const [mobileChatOpen, setMobileChatOpen] = useState(focusedChatMode);
  const [focusedView, setFocusedView] = useState(focusedChatMode);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const name = t.partner
        ? `${t.partner.firstName} ${t.partner.lastName}`.toLowerCase()
        : "";
      const preview = t.lastMessage?.content.toLowerCase() ?? "";
      return name.includes(q) || preview.includes(q);
    });
  }, [searchQuery, threads]);

  const activeThread = useMemo(
    () => threads.find((t) => t.conversationId === selectedId) ?? threads[0] ?? null,
    [selectedId, threads],
  );

  async function selectThread(conversationId: string) {
    setSelectedId(conversationId);
    setMobileChatOpen(true);

    if (messagesByConv[conversationId]) {
      // Still refresh silently to mark incoming messages read and pull latest replies
      try {
        const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { messages: ChatMessageItem[] } };
          if (json.data?.messages) {
            setMessagesByConv((prev) => ({
              ...prev,
              [conversationId]: json.data!.messages,
            }));
          }
        }
      } catch {
        // Keep cached messages on silent refresh error
      }
      return;
    }

    setLoadingConvId(conversationId);
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { messages: ChatMessageItem[] } };
        if (json.data?.messages) {
          setMessagesByConv((prev) => ({
            ...prev,
            [conversationId]: json.data!.messages,
          }));
        }
      }
    } catch {
      pushToast({ kind: "error", title: "Unable to load messages" });
    } finally {
      setLoadingConvId((prev) => (prev === conversationId ? null : prev));
    }
  }

  async function handleSendMessage(
    conversationId: string,
    content: string,
    attachmentUrl?: string | null,
    replyToMessageId?: string | null,
  ): Promise<boolean> {
    const tempId = `temp-msg-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      senderId: currentUser.id,
      replyToMessageId: replyToMessageId ?? null,
      content,
      attachmentUrl: attachmentUrl ?? null,
      createdAt: new Date().toISOString(),
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), optimisticMsg],
    }));

    setThreads((prev) =>
      prev.map((t) =>
        t.conversationId === conversationId
          ? { ...t, lastMessage: optimisticMsg, updatedAt: optimisticMsg.createdAt }
          : t,
      ),
    );

    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          ...(attachmentUrl ? { attachmentUrl } : {}),
          ...(replyToMessageId ? { replyToMessageId } : {}),
        }),
      });
      const json = (await res.json()) as {
        data?: { message: ChatMessageItem };
        error?: { message: string };
      };

      if (res.ok && json.data?.message) {
        const saved = json.data.message;
        setMessagesByConv((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === tempId ? saved : m,
          ),
        }));
        setThreads((prev) =>
          prev.map((t) =>
            t.conversationId === conversationId ? { ...t, lastMessage: saved } : t,
          ),
        );
        return true;
      }

      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter((m) => m.id !== tempId),
      }));
      pushToast({ kind: "error", title: json.error?.message ?? "Unable to send message" });
      return false;
    } catch {
      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter((m) => m.id !== tempId),
      }));
      pushToast({ kind: "error", title: "Network error sending message" });
      return false;
    }
  }

  if (threads.length === 0) {
    return (
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-[#f6f8f7] p-6 text-interlink-ink dark:bg-[#0f1613] dark:text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.12),transparent_48%),radial-gradient(circle_at_88%_78%,rgba(59,104,70,0.08),transparent_54%)] dark:bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.08),transparent_48%),radial-gradient(circle_at_85%_80%,rgba(20,29,25,0.72),transparent_62%)]"
        />
        <Link
          href="/dashboard"
          aria-label="Back to home"
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-interlink-ink/[0.06] text-interlink-ink transition-colors hover:bg-interlink-ink/[0.12] dark:bg-white/[0.08] dark:text-white/90 dark:hover:bg-white/[0.15] lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="relative z-10 max-w-md text-center">
          <EmptyState
            title="No mentorship conversations yet"
            description="Private conversations are automatically created inside each mentorship workspace when a request is accepted."
            action={
              <Link
                href="/mentors"
                className="inline-flex items-center rounded-full bg-interlink-forest px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
              >
                Discover Mentors
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#f6f8f7] text-interlink-ink dark:bg-[#0f1613] dark:text-white lg:grid lg:h-[100dvh] lg:grid-cols-12">
      {/* Theme-Adaptive Subtle Mentee-Aligned Dark Green Radial Canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.12),transparent_48%),radial-gradient(circle_at_88%_78%,rgba(59,104,70,0.08),transparent_54%)] dark:bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.08),transparent_48%),radial-gradient(circle_at_85%_80%,rgba(20,29,25,0.72),transparent_62%)]"
      />

      {/* Immersive Full-Screen Thread List */}
      <aside
        className={`relative z-10 h-full min-h-0 flex-col bg-transparent backdrop-blur-md lg:col-span-4 lg:bg-interlink-surface/55 dark:lg:bg-[#0f1613]/90 ${
          focusedView ? "hidden" : mobileChatOpen ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-center justify-between gap-2 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/dashboard"
                aria-label="Back to home"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-interlink-ink/[0.06] text-interlink-ink transition-colors hover:bg-interlink-ink/[0.12] dark:bg-white/[0.08] dark:text-white/90 dark:hover:bg-white/[0.15] lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <h1 className="font-display text-lg font-semibold text-interlink-ink dark:text-white">
                Messages
              </h1>
            </div>
            <span className="rounded-full bg-interlink-ink/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-interlink-muted dark:bg-white/[0.10] dark:text-emerald-100/80">
              {threads.length} {threads.length === 1 ? "chat" : "chats"}
            </span>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-interlink-muted dark:text-emerald-100/50"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="w-full rounded-full bg-interlink-surface/90 py-2.5 pl-10 pr-4 text-[16px] text-interlink-ink shadow-subtle placeholder:text-interlink-muted focus:outline-none focus:ring-2 focus:ring-interlink-forest/40 dark:bg-[#141d19] dark:text-white dark:placeholder:text-emerald-100/45 sm:text-xs"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
          {filteredThreads.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-interlink-muted dark:text-white/50">
              No conversations match &ldquo;{searchQuery.trim()}&rdquo;.
            </p>
          ) : (
            filteredThreads.map((item) => {
              const isSelected = activeThread?.conversationId === item.conversationId;
              const partnerName = item.partner
                ? `${item.partner.firstName} ${item.partner.lastName}`
                : "Participant";
              return (
                <button
                  key={item.conversationId}
                  type="button"
                  onClick={() => void selectThread(item.conversationId)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-all ${
                    isSelected
                      ? "bg-interlink-surface shadow-subtle dark:bg-[#19241f] dark:shadow-none"
                      : "hover:bg-interlink-surface/65 dark:hover:bg-[#141d19]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={item.partner?.profileImage}
                        firstName={item.partner?.firstName ?? "P"}
                        lastName={item.partner?.lastName ?? ""}
                        size="sm"
                        className="border-interlink-border dark:border-white/15"
                      />
                      {item.mentorshipStatus === "active" && (
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#f6f8f7] bg-emerald-500 dark:border-[#0f1613] dark:bg-emerald-400"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-interlink-ink dark:text-white">
                          {partnerName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-interlink-muted dark:text-white/55">
                        {item.lastMessage
                          ? item.lastMessage.content
                          : "Tap to start the conversation"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-interlink-muted dark:text-white/40">
                      {formatDate(item.lastMessage?.createdAt ?? item.updatedAt)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-interlink-muted dark:text-white/35 lg:hidden" aria-hidden="true" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Active Chat Panel (Full-screen when focused or opened on mobile, 8-col pane on Desktop inbox) */}
      <section
        className={`relative z-10 h-full min-h-0 flex-col lg:flex ${
          focusedView
            ? "flex lg:col-span-12"
            : mobileChatOpen
              ? "flex lg:col-span-8"
              : "hidden lg:col-span-8"
        }`}
      >
        {activeThread && (
          <ConversationChatPanel
            conversationId={activeThread.conversationId}
            currentUser={currentUser}
            partner={activeThread.partner}
            mentorshipId={activeThread.mentorshipId}
            mentorshipStatus={activeThread.mentorshipStatus}
            messages={messagesByConv[activeThread.conversationId] ?? []}
            loadingMessages={loadingConvId === activeThread.conversationId}
            onSendMessage={(content, attachmentUrl, replyToMessageId) =>
              handleSendMessage(
                activeThread.conversationId,
                content,
                attachmentUrl,
                replyToMessageId,
              )
            }
            onBack={() => {
              if (focusedView) {
                setFocusedView(false);
                setMobileChatOpen(false);
                router.back();
              } else {
                setMobileChatOpen(false);
              }
            }}
            alwaysShowBack={focusedView}
            showWorkspaceLink
            transparentCanvas
            className="h-full"
          />
        )}
      </section>
    </div>
  );
}
