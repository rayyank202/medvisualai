import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export const OPEN_CHAT_EVENT = "medvisual:open-chat";

export function openChatWidget() {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const CANNED =
  "I'm the MedVisual study assistant. Once your backend is connected I'll answer from your uploaded notes — try asking about the cardiac cycle or beta blockers.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Hey! Ask me anything about your notes, or generate a quiz." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: CANNED }]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="glass-panel flex h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col rounded-2xl text-deep-foreground">
          <div className="flex items-center justify-between border-b border-primary-glow/20 px-4 py-3">
            <p className="text-sm font-semibold">MedVisual Assistant</p>
            <button
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-deep-foreground/60 hover:bg-primary/20 hover:text-deep-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-brand px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[90%] rounded-2xl rounded-bl-sm bg-primary/15 px-3 py-2 text-sm text-deep-foreground/85"
                }
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-primary-glow/20 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a topic…"
              aria-label="Message"
              className="min-w-0 flex-1 rounded-xl bg-primary/10 px-3 py-2 text-sm text-deep-foreground outline-none placeholder:text-deep-foreground/40 focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              aria-label="Send"
              className="rounded-xl bg-gradient-brand px-3 text-primary-foreground"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide assistant" : "Open assistant"}
        className="flex size-14 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow transition-transform hover:scale-105"
      >
        <MessageCircle className="size-6" />
      </button>
    </div>
  );
}
