"use client";

import { useEffect, useState } from "react";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { rememberNode } from "@/lib/nodePresence";
import { MarkLock } from "@/components/MarkLock";

type Me = { code: number; name: string } | null;
type PromptStep = "ask" | "skip-note" | null;

const TG_PROMPT_DONE = "cyp-tg-prompt-done";

export default function BornPage() {
  const [me, setMe] = useState<Me>(null);
  const [prompt, setPrompt] = useState<PromptStep>(null);
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

  useEffect(() => {
    if (!me) return;
    try {
      if (sessionStorage.getItem(TG_PROMPT_DONE) === "1") return;
      if (sessionStorage.getItem("node-open-notify") !== "1") return;
    } catch {
      /* ignore */
    }
    let stop = false;
    fetch("/api/telegram/link", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { linked?: boolean; configured?: boolean }) => {
        if (stop) return;
        setConfigured(Boolean(data.configured));
        if (data.linked) {
          markPromptDone();
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
  }, [me]);

  function markPromptDone() {
    try {
      sessionStorage.setItem(TG_PROMPT_DONE, "1");
      sessionStorage.removeItem("node-open-notify");
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
        setNote(data.error || "봇 설정이 아직 없습니다.");
        setConfigured(false);
        setBusy(false);
        return;
      }
      markPromptDone();
      window.location.href = data.url;
    } catch {
      setNote("봇 설정이 아직 없습니다.");
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
  }

  const code = me ? String(me.code).padStart(3, "0") : "—";

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

      {prompt ? (
        <div className="born-notify-layer" role="dialog" aria-modal="true">
          <div className="born-notify">
            {prompt === "ask" ? (
              <>
                <h2 className="lede">텔레그램으로 채팅 알림</h2>
                <p className="hint">
                  채팅이 오면 텔레그램으로 노드 번호와 링크가 옵니다. 이 텔레그램에 적은 글은 상대에게 가지 않습니다.
                </p>
                <p className="ko">Chat alerts via Telegram — node number and a link only.</p>
                {!configured || note ? (
                  <p className="hint">{note || "봇 설정이 아직 없습니다."}</p>
                ) : null}
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => void openTelegram()}
                >
                  텔레그램으로 받기
                </button>
                <button className="text-btn" type="button" onClick={skipAsk}>
                  나중에
                </button>
              </>
            ) : (
              <>
                <p className="hint">
                  채팅은 이 웹의 메시지 아이콘에서 확인합니다. 알림은 오른쪽 위 종 아이콘에서 나중에 켤 수 있습니다.
                </p>
                <button className="btn" type="button" onClick={dismissSkipNote}>
                  알겠습니다
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
