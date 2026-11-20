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
  Eye,
  FileText,
  Loader2,
  Paperclip,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MediaDropzone } from "@/components/ui/media/MediaDropzone";

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

type AttachmentKind = "image" | "video" | "document";

function detectAttachmentKind(url: string): AttachmentKind {
  let target = url;
  try {
    target = decodeURIComponent(url);
  } catch {
    // Keep original url if URI decoding fails.
  }
  const clean = target.split("#")[0] ?? target;
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(clean)) return "video";
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(clean)) return "image";
  return "document";
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
  transparentCanvas = false,
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
  transparentCanvas?: boolean;
  className?: string;
}) {
  const [messageText, setMessageText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [attachmentDropzoneKey, setAttachmentDropzoneKey] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    kind: AttachmentKind;
  } | null>(null);
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
    (messageText.trim().length > 0 || attachmentUrl.trim().length > 0);

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
    const cleanedAttachment = attachmentUrl.trim() || null;
    const trimmed =
      messageText.trim() || (cleanedAttachment ? "Shared an attachment" : "");
    if (!trimmed || !conversationId || isTerminated || sending) return;

    const prevText = messageText;
    const prevAttachment = attachmentUrl;
    setMessageText("");
    setAttachmentUrl("");
    setShowAttachmentInput(false);
    setAttachmentDropzoneKey((k) => k + 1);

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

  function renderAttachmentBubble(url: string) {
    const kind = detectAttachmentKind(url);
    return (
      <div className="mt-2 overflow-hidden rounded-2xl border border-interlink-border bg-white dark:border-white/10 dark:bg-black/30">
        {kind === "image" ? (
          <button
            type="button"
            onClick={() => setPreviewAttachment({ url, kind })}
            aria-label="Preview attached image"
            className="group relative block focus:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Message attachment"
              className="max-h-56 w-auto rounded-2xl object-cover transition-transform group-hover:scale-[1.01]"
            />
            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Eye className="h-3 w-3" aria-hidden="true" />
              Preview
            </span>
          </button>
        ) : kind === "video" ? (
          <div className="p-1.5">
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="max-h-60 w-full rounded-xl bg-black object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <FileText
              className="h-4 w-4 shrink-0 text-interlink-forest dark:text-emerald-300"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setPreviewAttachment({ url, kind })}
              className="text-xs font-semibold text-interlink-forest hover:underline dark:text-emerald-200"
            >
              Preview Document
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open document in new tab"
              className="ml-1 text-interlink-muted hover:text-interlink-ink dark:text-white/60 dark:hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-0 flex-col overflow-hidden ${
        transparentCanvas
          ? ""
          : "rounded-3xl bg-[#f6f8f7] shadow-elevated ring-1 ring-interlink-border/75 dark:bg-[#0e1011] dark:ring-white/[0.08]"
      } text-interlink-ink dark:text-white ${className}`}
    >
      {/* Theme-Adaptive Subtle Warm Ambient Radial Backdrop (No Green Clash) */}
      {!transparentCanvas && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.14),transparent_48%),radial-gradient(circle_at_88%_78%,rgba(32,43,60,0.04),transparent_52%)] dark:bg-[radial-gradient(circle_at_12%_18%,rgba(200,159,93,0.18),transparent_44%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.02),transparent_50%)]"
        />
      )}

      {/* Compact Frosted Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-interlink-border/60 bg-interlink-surface/75 px-4 py-3 backdrop-blur-md dark:border-white/[0.07] dark:bg-white/[0.02] sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-interlink-ink/[0.06] text-interlink-ink transition-colors hover:bg-interlink-ink/[0.12] dark:bg-white/[0.08] dark:text-white/90 dark:hover:bg-white/[0.15] ${
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
              className="border-interlink-border dark:border-white/15"
            />
            {mentorshipStatus === "active" && (
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-interlink-surface bg-emerald-500 dark:border-[#0e1011] dark:bg-emerald-400"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-display text-sm font-semibold text-interlink-ink dark:text-white sm:text-base">
              {partnerFullName}
            </h2>
            <p className="flex items-center gap-1.5 text-[11px] text-interlink-muted dark:text-white/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  mentorshipStatus === "active"
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : mentorshipStatus === "completed"
                      ? "bg-sky-500 dark:bg-sky-400"
                      : "bg-amber-500 dark:bg-amber-400"
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-interlink-border/80 bg-interlink-surface px-3 py-1.5 text-xs font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest dark:border-white/12 dark:bg-white/[0.06] dark:text-white/85 dark:hover:bg-white/[0.14] dark:hover:text-white"
          >
            <span>Workspace</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </header>

      {/* Scrollable Message Stream */}
      <div
        ref={listRef}
        className="relative z-10 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3.5 py-5 sm:px-6"
      >
        {loadingMessages ? (
          <div className="space-y-4">
            <div className="flex items-start justify-end gap-2.5">
              <div className="h-10 w-56 animate-pulse rounded-2xl bg-interlink-border/45 dark:bg-white/[0.08]" />
              <div className="h-7 w-7 animate-pulse rounded-full bg-interlink-border/55 dark:bg-white/[0.12]" />
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 animate-pulse rounded-full bg-interlink-border/55 dark:bg-white/[0.12]" />
              <div className="h-16 w-64 animate-pulse rounded-2xl bg-interlink-border/35 dark:bg-white/[0.06]" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-medium text-interlink-ink dark:text-white/85">
              Start a conversation with {partner?.firstName ?? "your partner"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-interlink-muted dark:text-white/50">
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
                    <div className="rounded-2xl border border-interlink-border/75 bg-white px-4 py-2.5 text-[14px] leading-relaxed text-interlink-ink shadow-subtle backdrop-blur-md dark:border-white/[0.09] dark:bg-white/[0.11] dark:text-white/95">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {msg.attachmentUrl && renderAttachmentBubble(msg.attachmentUrl)}

                    <span className="mt-1 px-1 text-[10px] text-interlink-muted dark:text-white/40">
                      {isTemp ? "Sending..." : formatDateTime(msg.createdAt)}
                    </span>
                  </div>

                  <UserAvatar
                    src={currentUser.profileImage}
                    firstName={currentUser.firstName}
                    lastName={currentUser.lastName}
                    size="xs"
                    className="mt-0.5 shrink-0 border-interlink-border dark:border-white/20"
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
                  className="mt-0.5 shrink-0 border-interlink-border dark:border-white/20 dark:bg-black/60"
                />

                <div className="flex max-w-[78%] flex-col items-start sm:max-w-[68%]">
                  <div className="flex items-start gap-2">
                    <div className="rounded-2xl border border-interlink-border/80 bg-[#edf1ee] px-4 py-2.5 text-[14px] leading-relaxed text-interlink-ink shadow-subtle backdrop-blur-md dark:border-white/[0.08] dark:bg-[#141719]/90 dark:text-white/95">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {/* Reference-style micro-action rail beside incoming message */}
                    <div className="flex flex-col gap-1 pt-0.5 opacity-60 transition-opacity group-hover/msg:opacity-100">
                      <button
                        type="button"
                        onClick={() => void handleCopy(msg)}
                        aria-label="Copy message"
                        title="Copy message"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-interlink-ink/[0.06] text-interlink-muted transition-colors hover:bg-interlink-ink/[0.12] hover:text-interlink-ink dark:bg-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.16] dark:hover:text-white"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3 w-3" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuote(msg)}
                        aria-label="Reply to message"
                        title="Reply to message"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-interlink-ink/[0.06] text-interlink-muted transition-colors hover:bg-interlink-ink/[0.12] hover:text-interlink-ink dark:bg-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.16] dark:hover:text-white"
                      >
                        <CornerUpLeft className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {msg.attachmentUrl && renderAttachmentBubble(msg.attachmentUrl)}

                  <span className="mt-1 px-1 text-[10px] text-interlink-muted dark:text-white/40">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {hasOptimistic && (
          <div className="flex items-center gap-2.5 text-xs text-interlink-muted dark:text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-interlink-forest dark:text-emerald-400" aria-hidden="true" />
            <span>Delivering message...</span>
          </div>
        )}
      </div>

      {/* Floating Glass Multi-Row Composer (Anchored cleanly at bottom) */}
      <div className="relative z-10 shrink-0 px-3 pb-3 pt-1 sm:px-5 sm:pb-4">
        <form
          onSubmit={handleFormSubmit}
          className="rounded-[20px] border border-interlink-border/90 bg-interlink-surface/95 p-3 shadow-[0_8px_28px_rgba(32,43,60,0.08)] backdrop-blur-xl dark:border-white/[0.10] dark:bg-white/[0.06] dark:shadow-[0_12px_36px_rgba(0,0,0,0.38)] sm:p-3.5"
        >
          {showAttachmentInput && (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-interlink-muted dark:text-white/55">
                  Attach image, video, or document
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentUrl("");
                    setShowAttachmentInput(false);
                    setAttachmentDropzoneKey((k) => k + 1);
                  }}
                  aria-label="Close attachment panel"
                  className="rounded-full p-1 text-interlink-muted hover:bg-interlink-border/30 hover:text-interlink-ink dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <MediaDropzone
                key={attachmentDropzoneKey}
                acceptKind="all"
                purpose="chat"
                mentorshipId={mentorshipId}
                cropAspect="free"
                compact
                onUploaded={(result) => setAttachmentUrl(result.url)}
                onRemoved={() => setAttachmentUrl("")}
              />
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
            className="max-h-28 w-full resize-none bg-transparent text-[16px] leading-relaxed text-interlink-ink placeholder:text-interlink-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:placeholder:text-white/40 sm:text-sm"
          />

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setShowAttachmentInput((prev) => !prev)}
                disabled={isTerminated || !conversationId}
                aria-label="Attach image, video, or document"
                title="Attach image, video, or document"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  showAttachmentInput || attachmentUrl
                    ? "border-interlink-forest/50 bg-interlink-forest/15 text-interlink-forest dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-200"
                    : "border-interlink-border bg-interlink-app-bg text-interlink-muted hover:bg-interlink-border/30 hover:text-interlink-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.14] dark:hover:text-white"
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
                    ? "border-interlink-forest/40 bg-interlink-forest/10 text-interlink-forest dark:border-white/20 dark:bg-white/[0.12] dark:text-white"
                    : "border-interlink-border bg-interlink-app-bg text-interlink-muted hover:bg-interlink-border/30 hover:text-interlink-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.14] dark:hover:text-white"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {showPromptChips &&
                visibleChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-interlink-border/80 bg-interlink-app-bg px-2.5 py-1 text-[11px] font-medium text-interlink-ink/85 transition-colors hover:border-interlink-forest/50 hover:text-interlink-ink dark:border-white/10 dark:bg-white/[0.07] dark:text-white/80 dark:hover:bg-white/[0.14] dark:hover:text-white"
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
                      className="text-interlink-muted hover:text-interlink-ink dark:text-white/45 dark:hover:text-white"
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
                  : "cursor-not-allowed bg-interlink-border/60 text-interlink-muted dark:bg-white/[0.10] dark:text-white/40"
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

        <p className="mt-2 text-center text-[11px] text-interlink-muted dark:text-white/40">
          Never share passwords, banking PINs, or sensitive identity documents in messages.
        </p>
      </div>

      <Modal
        open={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        title="Attachment Preview"
        maxWidthClass="max-w-3xl"
      >
        {previewAttachment?.kind === "image" && (
          <div className="flex max-h-[75vh] justify-center overflow-auto rounded-2xl bg-black/5 p-2 dark:bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewAttachment.url}
              alt="Message attachment preview"
              className="max-h-[70vh] rounded-xl object-contain"
            />
          </div>
        )}

        {previewAttachment?.kind === "document" && (
          <div className="overflow-hidden rounded-2xl border border-interlink-border bg-white dark:border-white/10">
            <iframe
              src={previewAttachment.url}
              title="Message document preview"
              className="h-[70vh] w-full"
            />
          </div>
        )}

        {previewAttachment && (
          <div className="mt-4 flex justify-end gap-2">
            <a
              href={previewAttachment.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-interlink-border px-4 text-sm font-medium text-interlink-ink hover:bg-interlink-app-bg dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              Open in new tab
            </a>
            <Button type="button" onClick={() => setPreviewAttachment(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
