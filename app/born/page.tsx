"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { rememberNode } from "@/lib/nodePresence";
import { MarkLock } from "@/components/MarkLock";

type Me = { code: number; name: string } | null;
type PromptStep = "ask" | "skip-note" | null;

const TG_PROMPT_DONE = "cyp-tg-prompt-done";
const TG_OPEN_NOTIFY = "node-open-notify";

function stillNeedsTgPrompt(): boolean {
  try {
    if (sessionStorage.getItem(TG_PROMPT_DONE) === "1") return false;
    if (sessionStorage.getItem(TG_OPEN_NOTIFY) !== "1") return false;
    return true;
  } catch {
    return false;
  }
}

export default function BornPage() {
  const [me, setMe] = useState<Me>(null);
  const [prompt, setPrompt] = useState<PromptStep>(null);
  const [blocking, setBlocking] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: Me }) => {
        rememberNode(Boolean(data.me));
        setMe(data.me ?? null);
      })
      .catch(() => setMe(null));
  }, []);

  // Scrim on first paint when this tab still needs the prompt — do not wait for session/link.
  useLayoutEffect(() => {
    if (!stillNeedsTgPrompt()) return;

    setBlocking(true);
    let stop = false;
    fetch("/api/telegram/link", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { linked?: boolean; configured?: boolean }) => {
        if (stop) return;
        setConfigured(Boolean(data.configured));
        if (data.linked) {
          markPromptDone();
          setBlocking(false);
          return;
        }
        setPrompt("ask");
      })
      .catch(() => {
        if (!stop) setPrompt("ask");
      });
    return () => {
      stop = true;
    };
  }, []);

  function markPromptDone() {
    try {
      sessionStorage.setItem(TG_PROMPT_DONE, "1");
      sessionStorage.removeItem(TG_OPEN_NOTIFY);
    } catch {
      /* ignore */
    }
  }

  async function openTelegram() {
    setNote("");
    setBusy(true);
    try {
      const response = await fetch("/api/telegram/link", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setNote(data.error || "Telegram bot is not configured yet.");
        setConfigured(false);
        setBusy(false);
        return;
      }
      markPromptDone();
      window.location.href = data.url;
    } catch {
      setNote("Telegram bot is not configured yet.");
      setConfigured(false);
      setBusy(false);
    }
  }

  function skipAsk() {
    setPrompt("skip-note");
  }

  function dismissSkipNote() {
    markPromptDone();
    setPrompt(null);
    setBlocking(false);
  }

  const code = me ? String(me.code).padStart(3, "0") : "—";
  const showLayer = blocking || prompt !== null;

  return (
    <main className="cyp born">
      <GroveBackdrop />
      <p className="kicker">CYP3 | PROOF OF COEXISTENCE EXPERIMENT - 001</p>
      <MarkLock variant="born" />
      <h1 className="display">YOU ARE A NODE</h1>
      <p className="ko center">당신은 하나의 노드가 되었습니다.</p>
      <p className="code-no">#{code}</p>
      <p className="fine">CALLSIGN</p>
      <p className="callsign">{me?.name ?? "…"}</p>
      <p>Your node has been added to the Node Grove.</p>
      <p className="ko center">당신의 노드가 노드 그로브에 추가되었습니다.</p>
      <a className="cyp-btn" href="/my-node">
        <span>
          VIEW MY NODE <i aria-hidden>→</i>
        </span>
        <small>내 노드 보기</small>
      </a>
      <a className="cyp-btn" href="/usershow">
        <span>
          EXPLORE THE NODE GROVE <i aria-hidden>→</i>
        </span>
        <small>노드 그로브 탐색하기</small>
      </a>

      {showLayer ? (
        <div className="born-notify-layer" role="dialog" aria-modal="true">
          {prompt ? (
            <div className="born-notify">
              {prompt === "ask" ? (
                <>
                  <h2 className="lede">Chat alerts via Telegram</h2>
                  <p className="hint">
                    When a chat arrives, Telegram sends your node number and a link. Text you type in Telegram is not
                    delivered to them.
                  </p>
                  {!configured || note ? (
                    <p className="hint">{note || "Telegram bot is not configured yet."}</p>
                  ) : null}
                  <button
                    className="btn"
                    type="button"
                    disabled={busy}
                    onClick={() => void openTelegram()}
                  >
                    Get Telegram alerts
                  </button>
                  <button className="text-btn" type="button" onClick={skipAsk}>
                    Later
                  </button>
                </>
              ) : (
                <>
                  <p className="hint">
                    Check chats via the site message icon. You can turn on alerts later from the bell.
                  </p>
                  <button className="btn" type="button" onClick={dismissSkipNote}>
                    OK
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
