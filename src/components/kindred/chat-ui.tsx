/**
 * Presentational components for the chat thread.
 *
 * MessageBubble, MessageComposer, DeepTalkCard, ConversationStarter,
 * MessageSkeleton, MessageError — all using existing Kindred design tokens.
 */
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage, DeepTalkPrompt, DeepTalkCategory } from "@/lib/messaging/types";
import { DEEP_TALK_CATEGORIES } from "@/lib/messaging/types";

// ── Message Bubble ──────────────────────────────────────────────────────

export function MessageBubble({
  message,
  isOwn,
  onRetry,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onRetry?: (() => void | Promise<void>) | undefined;
}) {
  const isDeepTalk = message.messageType === "deep_talk_prompt";
  const isFailed = message.state === "failed";
  const isSending = message.state === "sending";

  if (isDeepTalk) {
    return (
      <div className="mx-auto max-w-sm motion-safe:animate-step-in">
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <p className="text-[12px] font-semibold tracking-wide text-accent-foreground/80 uppercase">
            Deep Talk
          </p>
          <p className="mt-2 font-display text-[17px] leading-relaxed tracking-tight text-primary">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  if (message.messageType === "system") {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-[13px] text-muted-foreground">{message.content}</p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex motion-safe:animate-step-in", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md",
          isFailed && "opacity-70",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          {isSending && (
            <Loader2 className="size-3 animate-spin text-current opacity-50" aria-label="Sending" />
          )}
          {isFailed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive-foreground opacity-80 hover:opacity-100"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Retry
            </button>
          )}
          <time className="text-[11px] opacity-50" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ── Message Composer ────────────────────────────────────────────────────

export function MessageComposer({
  onSend,
  onDeepTalk,
  disabled = false,
  placeholder = "Write something…",
}: {
  onSend: (content: string) => void;
  onDeepTalk: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0 && !disabled;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend(text.trim());
        setText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-border/50 bg-background px-4 py-3"
    >
      <Button
        type="button"
        variant="ghost"
        onClick={onDeepTalk}
        disabled={disabled}
        className="size-10 shrink-0 rounded-full p-0 text-muted-foreground hover:text-accent-foreground"
        aria-label="Deep Talk"
      >
        <Sparkles className="size-4.5" aria-hidden="true" />
      </Button>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border border-border/60 bg-secondary/50 px-4 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
        aria-label="Message"
      />
      <Button
        type="submit"
        disabled={!canSend}
        className="size-10 shrink-0 rounded-full p-0"
        aria-label="Send message"
      >
        <ArrowUp className="size-4.5" aria-hidden="true" />
      </Button>
    </form>
  );
}

// ── Conversation Starter (empty chat) ───────────────────────────────────

export function ConversationStarter({
  firstName,
  conversationStarter,
  onUsePrompt,
  onStartMyself,
}: {
  firstName: string;
  conversationStarter: string | null;
  onUsePrompt: () => void;
  onStartMyself: () => void;
}) {
  return (
    <section className="mx-auto max-w-sm text-center motion-safe:animate-step-in">
      <h2 className="font-display text-2xl tracking-tight text-primary">You found each other.</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        You and {firstName} both chose to meet. Start with something real.
      </p>
      {conversationStarter && (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-[14px] leading-relaxed text-primary">{conversationStarter}</p>
        </div>
      )}
      <div className="mt-6 grid gap-3">
        {conversationStarter && (
          <Button onClick={onUsePrompt} className="h-11 rounded-xl text-[14px] font-medium">
            Use this prompt
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onStartMyself}
          className="h-11 text-[14px] font-medium text-muted-foreground hover:text-primary"
        >
          I'll start myself
        </Button>
      </div>
    </section>
  );
}

// ── Deep Talk Panel ─────────────────────────────────────────────────────

export function DeepTalkPanel({
  prompts,
  isLoading,
  onSelect,
  onClose,
  isUsing,
}: {
  prompts: DeepTalkPrompt[];
  isLoading: boolean;
  onSelect: (promptId: string) => void;
  onClose: () => void;
  isUsing: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<DeepTalkCategory>("Values");
  const filtered = prompts.filter((p) => p.category === activeCategory && !p.used);

  return (
    <div className="border-t border-border/50 bg-background px-4 pb-4 pt-3 motion-safe:animate-step-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-primary">
            Want to go a little deeper?
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Choose a question and see where the conversation goes.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-8 px-2 text-[13px] text-muted-foreground"
        >
          Close
        </Button>
      </div>

      {/* Category tabs */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {DEEP_TALK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Prompts */}
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">
            All prompts in this category have been used.
          </p>
        ) : (
          filtered.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              disabled={isUsing}
              onClick={() => onSelect(prompt.id)}
              className="w-full rounded-xl border border-border/50 bg-background p-3 text-left text-[14px] leading-relaxed text-primary transition-colors hover:border-accent/50 disabled:opacity-50"
            >
              {prompt.promptText}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Connection Ended Banner ─────────────────────────────────────────────

export function ConnectionEndedBanner() {
  return (
    <div className="border-t border-border/50 bg-secondary/30 px-4 py-4 text-center">
      <p className="text-[14px] font-medium text-muted-foreground">This connection has ended.</p>
    </div>
  );
}

// ── Load Earlier ────────────────────────────────────────────────────────

export function LoadEarlierButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex justify-center py-3">
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        disabled={isLoading}
        className="h-8 text-[13px] font-medium text-muted-foreground"
      >
        {isLoading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
        Load earlier messages
      </Button>
    </div>
  );
}

// ── Skeletons / Errors ──────────────────────────────────────────────────

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <div
            className={cn(
              "h-12 animate-pulse rounded-2xl",
              i % 2 === 0 ? "w-2/3 bg-secondary" : "w-1/2 bg-primary/10",
            )}
          />
        </div>
      ))}
    </div>
  );
}

export function ChatError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-[15px] text-muted-foreground">We couldn't load this conversation.</p>
      <Button variant="outline" onClick={onRetry} className="h-10 rounded-xl text-[14px]">
        Try again
      </Button>
    </div>
  );
}

// ── Report / Block Placeholder ──────────────────────────────────────────

export function ReportBlockMenu({ firstName }: { firstName: string }) {
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowReport(true)}
        className="text-[12px] text-muted-foreground hover:text-destructive"
      >
        Report or block
      </button>
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6">
            <h3 className="font-display text-xl tracking-tight text-primary">
              Report {firstName}?
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Reporting and blocking features are being finalized. This action is not yet available.
            </p>
            <Button onClick={() => setShowReport(false)} className="mt-4 w-full h-11 rounded-xl">
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
