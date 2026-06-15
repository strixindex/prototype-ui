import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect } from "react";
import { getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LayoutPanelLeft, SquarePen, LogOut } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");

  return (
    <nav className="flex flex-col gap-px">
      {threads.map((t) => {
        let itemText = t.thread_id;
        if (
          typeof t.values === "object" &&
          t.values &&
          "messages" in t.values &&
          Array.isArray(t.values.messages) &&
          t.values.messages?.length > 0
        ) {
          const firstMessage = t.values.messages[0];
          itemText = getContentString(firstMessage.content);
        }
        const isActive = t.thread_id === threadId;
        return (
          <button
            key={t.thread_id}
            onClick={(e) => {
              e.preventDefault();
              onThreadClick?.(t.thread_id);
              if (t.thread_id === threadId) return;
              setThreadId(t.thread_id);
            }}
            className={cn(
              "w-full truncate rounded-md px-3 py-2 text-left text-[13px] transition-colors",
              isActive
                ? "bg-white/5 text-neutral-200"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5",
            )}
          >
            <p className="truncate">{itemText}</p>
          </button>
        );
      })}
    </nav>
  );
}

function SidebarContent({ isOpen }: { isOpen: boolean }) {
  const [, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(true),
  );
  const [, setThreadId] = useQueryState("threadId");

  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } =
    useThreads();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThreadsLoading(true);
    getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
  }, []);

  return (
    <aside
      className={cn(
        "h-screen bg-[#161616] flex flex-col border-r border-white/5 shrink-0 transition-all duration-200",
        isOpen ? "w-[250px]" : "w-[52px]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <img
            src="/logo2.svg"
            alt="StrixIndex"
            className="w-5 h-5 object-contain"
          />

          {isOpen && (
            <>
              <span className="text-white font-bold text-sm tracking-widest">
                STRIX
              </span>

              <span className="text-gray-400 font-light text-sm tracking-widest">
                INDEX
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => setChatHistoryOpen((p) => !p)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
        >
          <LayoutPanelLeft size={16} />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2">
        {isOpen ? (
          <button
            onClick={() => setThreadId(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors text-sm whitespace-nowrap"
          >
            <SquarePen size={15} className="shrink-0" />
            Buat Percakapan Baru
          </button>
        ) : (
          <button
            onClick={() => setThreadId(null)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors mx-auto"
          >
            <SquarePen size={15} />
          </button>
        )}
      </div>

      {/* Thread List */}
      {isOpen && !threadsLoading && threads.length > 0 && (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest px-2 mb-2">
            Percakapan Anda
          </p>
          <ThreadList threads={threads} />
        </div>
      )}

      {(!isOpen || threadsLoading || threads.length === 0) && (
        <div className="flex-1" />
      )}

      {/* User Footer */}
      <div className="px-3 py-3 border-t border-white/5">
        {isOpen ? (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 aspect-square rounded-full bg-teal-400 flex items-center justify-center text-black text-xs font-bold shrink-0">
                G
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-200">Guest</p>
                <p className="text-xs text-neutral-600">free</p>
              </div>
            </div>
            <button className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 aspect-square rounded-full bg-teal-400 flex items-center justify-center text-black text-xs font-bold shrink-0">
              G
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(true),
  );

  const isOpen = !!chatHistoryOpen;

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex h-screen shrink-0">
        <SidebarContent isOpen={isOpen} />
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <Sheet
          open={isOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex w-[215px] p-0 bg-[#161616] border-r border-white/5"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Thread History</SheetTitle>
            </SheetHeader>
            <SidebarContent isOpen={true} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}