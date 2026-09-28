"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Msg = { id: string; from: string; to: string; body: string; at: string };

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const TICKET = "cyp-node-ticket";

function ticketHeaders(): Record<string, string> {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("t");
    if (fromUrl) {
      sessionStorage.setItem(TICKET, fromUrl);
      const clean = new URL(window.location.href);
      clean.searchParams.delete("t");
      window.history.replaceState(null, "", `${clean.pathname}${clean.search}${clean.hash}`);
    }
    const ticket = sessionStorage.getItem(TICKET);
    return ticket ? { "x-node-ticket": ticket } : {};
  } catch {
    return {};
  }
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const otherId = params.id;
  const [meId, setMeId] = useState("");
  const [code, setCode] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch(`/api/chat/${otherId}`, { cache: "no-store", headers: ticketHeaders() });
      if (response.status === 401) {
        if (!stop) setError("No node in this browser. Open the chat link from Telegram again.");
        stop = true;
        return;
      }
      const data = (await response.json()) as {
        error?: string;
        me?: { id: string };
        other?: { code: number };
        messages?: Msg[];
      };
      if (!response.ok) throw new Error(data.error || "Could not open chat.");
      if (stop) return;
      setMeId(data.me?.id ?? "");
      setCode(data.other?.code ?? null);
      const incoming = data.messages ?? [];
      setMessages((prev) => {
        const pending = prev.filter(
          (item) =>
            item.id.startsWith("pending-") &&
            !incoming.some((saved) => saved.from === item.from && saved.body === item.body),
        );
        return [...incoming, ...pending];
      });
      setError("");
    }
    let timer = 0;
    const tick = () => {
      load()
        .catch((reason) => {
          if (!stop) setError(reason instanceof Error ? reason.message : "Could not open chat.");
        })
        .finally(() => {
          if (!stop) timer = window.setTimeout(tick, 700);
        });
    };
    tick();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [otherId]);

  useEffect(() => {
    if (!stick.current) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    if (!meId) {
      setError("No node in this browser. Open the chat link from Telegram again.");
      return;
    }
    const pending: Msg = {
      id: `pending-${Date.now()}`,
      from: meId,
      to: otherId,
      body,
      at: new Date().toISOString(),
    };
    setSending(true);
    setText("");
    setMessages((prev) => [...prev, pending]);
    stick.current = true;
    try {
      const response = await fetch(`/api/chat/${otherId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ticketHeaders() },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as { error?: string; message?: Msg };
      if (!response.ok || !data.message) throw new Error(data.error || "Send failed");
      setMessages((prev) => prev.map((item) => (item.id === pending.id ? data.message! : item)));
    } catch (reason) {
      setMessages((prev) => prev.filter((item) => item.id !== pending.id));
      setText(body);
      setError(reason instanceof Error ? reason.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="cyp-chat" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="subhead">
        <BackButton fallback="/my-node" />
        <span className="me-code">{code ? `NODE ${code}` : "…"}</span>
      </div>
      <div
        className="log"
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {messages.length === 0 ? <p className="hint">No messages yet.</p> : null}
        {messages.map((message) => {
          const mine = message.from === meId;
          return (
            <article key={message.id} className={mine ? "msg mine" : "msg theirs"}>
              <div className="meta">
                {mine ? "You" : code ?? ""} · {clock(message.at)}
              </div>
              <p>{message.body}</p>
            </article>
          );
        })}
      </div>
      {error ? <p className="error" style={{ padding: "0 16px" }}>{error}</p> : null}
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          maxLength={400}
          placeholder="Message"
          enterKeyHint="send"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.shiftKey) return;
            event.preventDefault();
            void send();
          }}
        />
        <button type="submit" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}
