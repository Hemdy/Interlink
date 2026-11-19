"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@interlink/utils";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  CornerUpLeft,
  ExternalLink,
  Loader2,
  Paperclip,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

export interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}

const DEFAULT_PROMPT_CHIPS = [
  { id: "agenda", label: "session agenda", text: "Hi! Could we align on our agenda for our next mentorship session? " },
  { id: "checkin", label: "goal check-in", text: "Quick goal check-in: here is what I completed this week — " },
  { id: "feedback", label: "ask feedback", text: "Would love your feedback when you have a moment: " },
];

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || url.startsWith("/api/v1/storage/file");
}

export function ConversationChatPanel({
  conversationId,
  currentUser,
  partner,
  mentorshipId,
  mentorshipStatus,
  messages,
  onSendMessage,
  sending = false,
  loadingMessages = false,
  onBack,
  alwaysShowBack = false,
  showWorkspaceLink = false,
  className = "",
}: {
  conversationId: string | null;
  currentUser: ChatParticipant;
  partner: ChatParticipant | null;
  mentorshipId: string;
  mentorshipStatus: string;
  messages: ChatMessageItem[];
  onSendMessage: (content: string, attachmentUrl?: string | null) => Promise<boolean>;
  sending?: boolean;
  loadingMessages?: boolean;
  onBack?: () => void;
  alwaysShowBack?: boolean;
  showWorkspaceLink?: boolean;
  className?: string;
}) {
  const [messageText, setMessageText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [showPromptChips, setShowPromptChips] = useState(true);
  const [dismissedChips, setDismissedChips] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isTerminated = mentorshipStatus === "terminated";
  const hasOptimistic = messages.some((m) => m.id.startsWith("temp-msg-"));
  const canSend =
    Boolean(conversationId) &&
    !isTerminated &&
    !sending &&
    messageText.trim().length > 0;

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, conversationId, loadingMessages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`;
  }, [messageText]);

  async function submitCurrentMessage() {
    const trimmed = messageText.trim();
    const cleanedAttachment = attachmentUrl.trim() || null;
    if (!trimmed || !conversationId || isTerminated || sending) return;

    const prevText = messageText;
    const prevAttachment = attachmentUrl;
    setMessageText("");
    setAttachmentUrl("");
    setShowAttachmentInput(false);

    const ok = await onSendMessage(trimmed, cleanedAttachment);
    if (!ok) {
      setMessageText(prevText);
      setAttachmentUrl(prevAttachment);
      if (prevAttachment) setShowAttachmentInput(true);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitCurrentMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitCurrentMessage();
    }
  }

  async function handleCopy(msg: ChatMessageItem) {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === msg.id ? null : prev));
      }, 1500);
    } catch {
      // Clipboard unavailable in restricted contexts
    }
  }

  function handleQuote(msg: ChatMessageItem) {
    const snippet = msg.content.trim().slice(0, 80);
    const quoteLine = `Re: "${snippet}${msg.content.trim().length > 80 ? "..." : ""}"\n`;
    setMessageText((prev) => (prev ? `${quoteLine}${prev}` : quoteLine));
    textareaRef.current?.focus();
  }

  const visibleChips = DEFAULT_PROMPT_CHIPS.filter((c) => !dismissedChips.includes(c.id));
  const partnerFullName = partner
    ? `${partner.firstName} ${partner.lastName}`.trim()
    : "Mentorship Partner";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl bg-[#0c110f] text-white shadow-elevated ring-1 ring-white/[0.08] ${className}`}
    >
      {/* Atmospheric Radial Glow Backdrop (Reference Aesthetic + Interlink Gold/Forest Tokens) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.23),transparent_44%),radial-gradient(circle_at_88%_76%,rgba(59,104,70,0.24),transparent_52%)]"
      />

      {/* Compact Frosted Header */}
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/90 transition-colors hover:bg-white/[0.15] ${
                alwaysShowBack ? "" : "lg:hidden"
              }`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="relative shrink-0">
            <UserAvatar
              src={partner?.profileImage}
              firstName={partner?.firstName ?? "P"}
              lastName={partner?.lastName ?? ""}
              size="sm"
              className="border-white/15"
            />
            {mentorshipStatus === "active" && (
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0c110f] bg-emerald-400"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-display text-sm font-semibold text-white sm:text-base">
              {partnerFullName}
            </h2>
            <p className="flex items-center gap-1.5 text-[11px] text-white/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  mentorshipStatus === "active"
                    ? "bg-emerald-400"
                    : mentorshipStatus === "completed"
                      ? "bg-sky-400"
                      : "bg-amber-400"
                }`}
                aria-hidden="true"
              />
              <span className="capitalize">{mentorshipStatus} mentorship</span>
            </p>
          </div>
        </div>

        {showWorkspaceLink && (
          <Link
            href={`/mentorships/${mentorshipId}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            <span>Workspace</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </header>

      {/* Scrollable Message Stream */}
      <div
        ref={listRef}
        className="relative z-10 flex-1 space-y-5 overflow-y-auto px-3.5 py-5 sm:px-6"
      >
        {loadingMessages ? (
          <div className="space-y-4">
            <div className="flex items-start justify-end gap-2.5">
              <div className="h-10 w-56 animate-pulse rounded-2xl bg-white/[0.08]" />
              <div className="h-7 w-7 animate-pulse rounded-full bg-white/[0.12]" />
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 animate-pulse rounded-full bg-white/[0.12]" />
              <div className="h-16 w-64 animate-pulse rounded-2xl bg-white/[0.06]" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-medium text-white/80">
              Start a conversation with {partner?.firstName ?? "your partner"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-white/50">
              Coordinate sessions, share milestone progress, and exchange helpful resources.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderId === currentUser.id;
            const isTemp = msg.id.startsWith("temp-msg-");

            if (mine) {
              return (
                <div
                  key={msg.id}
                  className="group/msg flex items-start justify-end gap-2.5 sm:gap-3"
                >
                  <div className="flex max-w-[78%] flex-col items-end sm:max-w-[68%]">
                    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.11] px-4 py-2.5 text-[14px] leading-relaxed text-white/95 shadow-subtle backdrop-blur-md">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {msg.attachmentUrl && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                        {isImageUrl(msg.attachmentUrl) ? (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.attachmentUrl}
                              alt="Message attachment"
                              className="max-h-52 w-auto rounded-2xl object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-200 hover:underline"
                          >
                            <Paperclip className="h-3 w-3" aria-hidden="true" />
                            <span>Open attachment</span>
                          </a>
                        )}
                      </div>
                    )}

                    <span className="mt-1 px-1 text-[10px] text-white/40">
                      {isTemp ? "Sending..." : formatDateTime(msg.createdAt)}
                    </span>
                  </div>

                  <UserAvatar
                    src={currentUser.profileImage}
                    firstName={currentUser.firstName}
                    lastName={currentUser.lastName}
                    size="xs"
                    className="mt-0.5 shrink-0 border-white/20"
                  />
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className="group/msg flex items-start justify-start gap-2.5 sm:gap-3"
              >
                <UserAvatar
                  src={partner?.profileImage}
                  firstName={partner?.firstName ?? "P"}
                  lastName={partner?.lastName ?? ""}
                  size="xs"
                  className="mt-0.5 shrink-0 border-white/20 bg-black/60"
                />

                <div className="flex max-w-[78%] flex-col items-start sm:max-w-[68%]">
                  <div className="flex items-start gap-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#080d0b]/90 px-4 py-2.5 text-[14px] leading-relaxed text-white/95 shadow-subtle backdrop-blur-md">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {/* Reference-style micro-action rail beside incoming message */}
                    <div className="flex flex-col gap-1 pt-0.5 opacity-60 transition-opacity group-hover/msg:opacity-100">
                      <button
                        type="button"
                        onClick={() => void handleCopy(msg)}
                        aria-label="Copy message"
                        title="Copy message"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.16] hover:text-white"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3 w-3" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuote(msg)}
                        aria-label="Reply to message"
                        title="Reply to message"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.16] hover:text-white"
                      >
                        <CornerUpLeft className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {msg.attachmentUrl && (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      {isImageUrl(msg.attachmentUrl) ? (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.attachmentUrl}
                            alt="Message attachment"
                            className="max-h-52 w-auto rounded-2xl object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-200 hover:underline"
                        >
                          <Paperclip className="h-3 w-3" aria-hidden="true" />
                          <span>Open attachment</span>
                        </a>
                      )}
                    </div>
                  )}

                  <span className="mt-1 px-1 text-[10px] text-white/40">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {hasOptimistic && (
          <div className="flex items-center gap-2.5 text-xs text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-hidden="true" />
            <span>Delivering message...</span>
          </div>
        )}
      </div>

      {/* Floating Glass Multi-Row Composer */}
      <div className="relative z-10 px-3 pb-3 pt-1 sm:px-5 sm:pb-4">
        <form
          onSubmit={handleFormSubmit}
          className="rounded-[20px] border border-white/[0.10] bg-white/[0.06] p-3 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.38)] sm:p-3.5"
        >
          {showAttachmentInput && (
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden="true" />
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Paste link or image URL (optional)..."
                aria-label="Attachment URL"
                className="w-full bg-transparent text-[16px] text-white placeholder:text-white/40 focus:outline-none sm:text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setAttachmentUrl("");
                  setShowAttachmentInput(false);
                }}
                aria-label="Close attachment input"
                className="text-white/50 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTerminated || !conversationId}
            placeholder={
              isTerminated
                ? "Messaging is closed for terminated mentorships."
                : `Write a message to ${partner?.firstName ?? "your partner"}...`
            }
            aria-label="Message text"
            className="max-h-28 w-full resize-none bg-transparent text-[16px] leading-relaxed text-white placeholder:text-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          />

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setShowAttachmentInput((prev) => !prev)}
                disabled={isTerminated || !conversationId}
                aria-label="Attach link or file URL"
                title="Attach link or image URL"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  showAttachmentInput || attachmentUrl
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                    : "border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.14] hover:text-white"
                }`}
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setShowPromptChips((prev) => !prev)}
                aria-label="Toggle quick message prompts"
                title="Quick prompts"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  showPromptChips
                    ? "border-white/20 bg-white/[0.12] text-white"
                    : "border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.14] hover:text-white"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {showPromptChips &&
                visibleChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/[0.14] hover:text-white"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMessageText((prev) => (prev ? `${prev} ${chip.text}` : chip.text));
                        textareaRef.current?.focus();
                      }}
                      className="focus:outline-none"
                    >
                      {chip.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedChips((prev) => [...prev, chip.id])}
                      aria-label={`Dismiss ${chip.label}`}
                      className="text-white/45 hover:text-white"
                    >
                      <X className="h-2.5 w-2.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
            </div>

            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 focus-ring ${
                canSend
                  ? "bg-interlink-forest text-white shadow-[0_4px_14px_rgba(59,104,70,0.48)] hover:bg-interlink-forest-hover"
                  : "bg-white/[0.10] text-white/40 cursor-not-allowed"
              }`}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-4 w-4 stroke-[2.25]" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>

        <p className="mt-2 text-center text-[11px] text-white/40">
          Never share passwords, banking PINs, or sensitive identity documents in messages.
        </p>
      </div>
    </div>
  );
}
