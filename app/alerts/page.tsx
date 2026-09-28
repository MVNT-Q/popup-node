"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

export default function AlertsPage() {
  const [linked, setLinked] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/telegram/link", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { linked?: boolean; configured?: boolean }) => {
        setLinked(Boolean(data.linked));
        setConfigured(Boolean(data.configured));
      })
      .catch(() => undefined);
  }, []);

  async function openTelegram() {
    setNote("");
    const response = await fetch("/api/telegram/link", { method: "POST" });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setNote(data.error || "연결 주소를 만들지 못했습니다.");
      return;
    }
    window.location.href = data.url;
  }

  async function unlink() {
    setNote("");
    const response = await fetch("/api/telegram/link", { method: "DELETE" });
    if (!response.ok) {
      setNote("연결을 끊지 못했습니다.");
      return;
    }
    setLinked(false);
  }

  return (
    <main className="pad cyp-inbox">
      <BackButton fallback="/my-node" />
      <h1 className="lede">알림</h1>

      {linked ? (
        <p className="hint">텔레그램 켜짐. 채팅이 오면 노드 번호와 링크가 옵니다.</p>
      ) : (
        <p className="hint">
          채팅은 이 웹의 메시지 아이콘에서 확인합니다. 이 페이지에서 텔레그램 알림을 켭니다.
        </p>
      )}
      <p className="hint">
        다른 참가자에게 텔레그램 주소는 보이지 않습니다. 채팅은 이 사이트에 남습니다.
      </p>

      {configured && !linked ? (
        <button className="btn-ghost btn-bi" type="button" onClick={() => void openTelegram()} style={{ marginTop: 10 }}>
          텔레그램으로 받기
          <small>Get Telegram alerts</small>
        </button>
      ) : null}
      {linked ? (
        <button className="text-btn" type="button" onClick={() => void unlink()}>
          텔레그램 연결 해제
        </button>
      ) : null}
      {!configured ? <p className="hint">봇 설정이 아직 없습니다.</p> : null}
      {note ? <p className="hint">{note}</p> : null}
    </main>
  );
}
