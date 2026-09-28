"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { InstallCard } from "@/components/InstallCard";
import { isStandalone } from "@/components/install";

export default function AlertsPage() {
  const [on, setOn] = useState<boolean | null>(null);
  const [home, setHome] = useState(false);
  const [linked, setLinked] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setHome(isStandalone());
    setOn("Notification" in window && Notification.permission === "granted");
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
      <p className="hint">
        {on == null ? "…" : on ? "이 폰 알림이 켜져 있습니다." : "이 폰 알림이 꺼져 있습니다."}
      </p>
      <p className="hint">
        {home ? "홈 화면 아이콘으로 열린 상태입니다." : "홈 화면에는 아직 없습니다. 아래에서 넣으면 알림이 이어집니다."}
      </p>
      <InstallCard place="inbox" />

      <h2 className="lede" style={{ marginTop: 28 }}>
        텔레그램
      </h2>
      <p className="hint">
        {linked ? "텔레그램 켜짐. 말이 오면 봇이 노드 번호와 링크만 보냅니다." : "텔레그램 꺼짐."}
      </p>
      <p className="hint">다른 참가자에게 텔레그램 주소는 보이지 않습니다.</p>
      {configured && !linked ? (
        <button className="btn-ghost" type="button" onClick={() => void openTelegram()} style={{ marginTop: 10 }}>
          텔레그램으로 받기
        </button>
      ) : null}
      {linked ? (
        <button className="text-btn" type="button" onClick={() => void unlink()}>
          텔레그램 연결 해제
        </button>
      ) : null}
      {!configured ? <p className="hint">텔레그램 봇 설정이 아직 없습니다.</p> : null}
      {note ? <p className="hint">{note}</p> : null}
    </main>
  );
}
