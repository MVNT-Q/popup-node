"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { InstallCard } from "@/components/InstallCard";

type Thread = {
  otherId: string;
  code: number;
  name: string;
  lastBody: string;
  lastAt: string;
  unread: number;
};

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/inbox", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { threads?: Thread[] };
      if (!stop) setThreads(data.threads ?? []);
    }
    const timer = window.setInterval(() => void load(), 1600);
    void load();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="pad cyp-inbox">
      <BackButton fallback="/my-node" />
      <h1 className="lede">받은 말</h1>

      <section className="cyp-inbox-notify" aria-label="알림 활성화 안내">
        <h2 className="cyp-inbox-notify-title">알림 활성화 안내</h2>
        <p className="cyp-inbox-notify-lead">
          Add this to your home screen, then allow notifications on this phone.
        </p>
        <p className="ko">먼저 홈 화면에 넣고, 이어서 이 폰 알림을 켭니다.</p>
        {/* 노드 있는 세션에서만 이 페이지 — 홈화면 설치 후 웹푸시. 종 아이콘에서는 여기로만 옴 */}
        <InstallCard place="join" />
      </section>

      {threads.length === 0 ? <p className="hint">아직 대화가 없다.</p> : null}
      <div className="threads">
        {threads.map((thread) => (
          <Link
            key={thread.otherId}
            href={`/chat/${thread.otherId}`}
            className={thread.unread ? "thread unread" : "thread"}
          >
            <div className="meta">
              <span>NODE {thread.code}</span>
              <span>
                {thread.unread ? `${thread.unread} ` : ""}
                {clock(thread.lastAt)}
              </span>
            </div>
            <p>{thread.lastBody}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
