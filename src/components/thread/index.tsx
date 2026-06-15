import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  SquarePen,
  Send,
  Square,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getContentString } from "./utils";

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>
      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <button
      onClick={() => scrollToBottom()}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors",
        props.className,
      )}
    >
      <ArrowDown className="w-3.5 h-3.5" />
      <span>Scroll to bottom</span>
    </button>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] as const },
});

export function Thread() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(true),
  );
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) return;
      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }
    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);
    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      },
    );
    setInput("");
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
    });
  };

  const chatStarted = !!threadId || !!messages.length;
  const hasNoAIOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );

  const firstHumanMessage = messages.find((m) => m.type === "human");
  const threadTitle = firstHumanMessage
    ? getContentString(firstHumanMessage.content)
    : "";

  const inputBox = (
    <div className="bg-[#2a2a2a] border border-gray-700 rounded-2xl px-6 py-6 flex items-start gap-3 focus-within:border-gray-500 transition-colors">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !e.metaKey &&
            !e.nativeEvent.isComposing
          ) {
            e.preventDefault();
            handleSubmit(e as unknown as FormEvent);
          }
        }}
        placeholder="Riset Indonesia Terbaru..."
        rows={3}
        className="flex-1 bg-transparent text-gray-300 text-sm placeholder:text-gray-500 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
        style={{ fieldSizing: "content" } as React.CSSProperties}
      />
      {stream.isLoading ? (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => stream.stop()}
          className="mb-1 p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
        >
          <Square size={22} />
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault();
            handleSubmit(e as unknown as FormEvent);
          }}
          disabled={!input.trim()}
          className="mb-1 p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="url(#sendGradient)" xmlns="http://www.w3.org/2000/svg"
          style={{ transform: "rotate(-35deg)" }}
        >
          <defs>
            <linearGradient id="sendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a3ffb0"/>
              <stop offset="50%" stopColor="#00e5ff"/>
              <stop offset="100%" stopColor="#0090ff"/>
            </linearGradient>
          </defs>
          <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"/>
        </svg>
        </motion.button>
      )}
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0f1012] text-foreground">
      {/* Sidebar */}
      <div className="relative hidden lg:flex h-screen shrink-0">
        <ThreadHistory />
      </div>

      {/* Main content */}
      <motion.div
        className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
        layout={isLargeScreen}
        animate={{ marginLeft: 0, width: "100%" }}
        transition={
          isLargeScreen
            ? { type: "spring", stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        {/* Top bar */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 flex items-center justify-between px-8 py-5 mt-1"
        >
          {/* Logo */}
          <button
            onClick={() => setThreadId(null)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img src="/logo2.svg" alt="StrixIndex" className="w-5 h-5 object-contain" />
            <span className="text-white font-bold text-sm tracking-widest">STRIX</span>
            <span className="text-gray-400 font-light text-sm tracking-widest">INDEX</span>
          </button>

          {/* Right — hanya tampil saat chat sudah dimulai */}
          {chatStarted && (
            <div className="flex items-center gap-3">
              {threadTitle && (
                <div className="hidden max-w-xs truncate rounded-full bg-white/5 border border-white/8 px-3 py-1.5 text-xs text-neutral-300 sm:block">
                  {threadTitle}
                </div>
              )}
              <TooltipIconButton
                size="lg"
                className="p-2 text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                tooltip="New thread"
                variant="ghost"
                onClick={() => setThreadId(null)}
              >
                <SquarePen className="size-4" />
              </TooltipIconButton>
            </div>
          )}
        </motion.nav>

        {/* ── HERO STATE (belum ada chat) ── */}
        {!chatStarted ? (
          <section className="flex flex-col items-center justify-center flex-1 py-10 px-4 text-center gap-0">
            <motion.h1
              {...fadeUp(0)}
              className="text-2xl font-semibold leading-[1.05] tracking-tight"
            >
              <span className="text-white">Dunia </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(to right, #a3ffb0, #00e5ff, #0090ff)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                Menunggu Riset
              </span>
              <span className="text-white"> Anda</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.15)}
              className="text-gray-200 text-sm font-normal max-w-md leading-relaxed"
            >
              Bertanya tanpa ragu dengan jawaban yang dapat diverifikasi
            </motion.p>

            <motion.div
              {...fadeUp(0.3)}
              className="w-full max-w-2xl mt-5"
            >
              {inputBox}
            </motion.div>
          </section>
        ) : (
          /* ── CHAT STATE (sudah ada pesan) ── */
          <StickToBottom className="relative flex-1 overflow-hidden">
            <StickyToBottomContent
              className="absolute inset-0 overflow-y-scroll scrollbar-thin grid grid-rows-[1fr_auto] px-4"
              contentClassName="pt-8 pb-4 max-w-2xl mx-auto flex flex-col gap-4 w-full"
              content={
                <>
                  {messages
                    .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                    .map((message, index) =>
                      message.type === "human" ? (
                        <HumanMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                        />
                      ) : (
                        <AssistantMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                          handleRegenerate={handleRegenerate}
                        />
                      ),
                    )}
                  {hasNoAIOrToolMessages && !!stream.interrupt && (
                    <AssistantMessage
                      key="interrupt-msg"
                      message={undefined}
                      isLoading={isLoading}
                      handleRegenerate={handleRegenerate}
                    />
                  )}
                  {isLoading && !firstTokenReceived && <AssistantMessageLoading />}
                </>
              }
              footer={
                <div className="sticky bottom-0 flex flex-col items-center bg-[#0f1012]">
                  <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 animate-in fade-in-0 zoom-in-95" />
                  <div className="relative z-10 mx-auto pb-5 pt-2 w-full max-w-2xl px-4">
                    {inputBox}
                    <p className="text-[11px] text-neutral-700 text-center mt-2">
                      AI dapat membuat kesalahan. Verifikasi informasi penting.
                    </p>
                  </div>
                </div>
              }
            />
          </StickToBottom>
        )}
      </motion.div>
    </div>
  );
}