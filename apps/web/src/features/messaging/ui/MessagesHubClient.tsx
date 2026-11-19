"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@interlink/utils";
import { ChevronRight, Search } from "lucide-react";
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
  ): Promise<boolean> {
    const tempId = `temp-msg-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      senderId: currentUser.id,
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
      <div className="relative flex h-[calc(100dvh-4.25rem-4.75rem-env(safe-area-inset-bottom))] min-h-[460px] items-center justify-center overflow-hidden bg-[#0c110f] p-6 text-white sm:rounded-3xl sm:ring-1 sm:ring-white/[0.08] lg:h-[calc(100vh-11rem)] lg:min-h-[540px] lg:max-h-[820px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.23),transparent_44%),radial-gradient(circle_at_88%_76%,rgba(59,104,70,0.24),transparent_52%)]"
        />
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
    <div className="relative h-[calc(100dvh-4.25rem-4.75rem-env(safe-area-inset-bottom))] min-h-[460px] overflow-hidden bg-[#0c110f] text-white sm:rounded-3xl sm:shadow-elevated sm:ring-1 sm:ring-white/[0.08] lg:grid lg:h-[calc(100vh-11rem)] lg:min-h-[540px] lg:max-h-[820px] lg:grid-cols-12">
      {/* Ambient Radial Glow Canvas matching the Chat Box Interface */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.23),transparent_44%),radial-gradient(circle_at_88%_76%,rgba(59,104,70,0.24),transparent_52%)]"
      />

      {/* Thread Sidebar (Full background & height on Mobile Inbox, 4-col sidebar on Desktop) */}
      <aside
        className={`relative z-10 h-full flex-col border-white/[0.07] bg-transparent backdrop-blur-md lg:col-span-4 lg:border-r lg:bg-[#0d1310]/45 ${
          focusedView ? "hidden" : mobileChatOpen ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="border-b border-white/[0.07] p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 pb-3">
            <h1 className="font-display text-base font-semibold text-white">Messages</h1>
            <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-white/75">
              {threads.length} {threads.length === 1 ? "chat" : "chats"}
            </span>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="w-full rounded-xl border border-white/[0.09] bg-white/[0.05] py-2 pl-9 pr-3 text-[16px] text-white placeholder:text-white/40 focus:border-interlink-forest focus:outline-none sm:text-xs"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {filteredThreads.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-white/50">
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
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-all ${
                    isSelected
                      ? "bg-white/[0.10] ring-1 ring-white/[0.12]"
                      : "hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={item.partner?.profileImage}
                        firstName={item.partner?.firstName ?? "P"}
                        lastName={item.partner?.lastName ?? ""}
                        size="sm"
                        className="border-white/15"
                      />
                      {item.mentorshipStatus === "active" && (
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d1310] bg-emerald-400"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">
                          {partnerName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/55">
                        {item.lastMessage
                          ? item.lastMessage.content
                          : "Tap to start the conversation"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-white/40">
                      {formatDate(item.lastMessage?.createdAt ?? item.updatedAt)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-white/35 lg:hidden" aria-hidden="true" />
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
            onSendMessage={(content, attachmentUrl) =>
              handleSendMessage(activeThread.conversationId, content, attachmentUrl)
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
            className="h-full rounded-none bg-transparent shadow-none ring-0"
          />
        )}
      </section>
    </div>
  );
}
