"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { InstallCard } from "@/components/InstallCard";

function Bell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.6a3.2 3.2 0 0 0-3.2 3.2v1.1c0 .7-.2 1.4-.7 2L3.2 9.2c-.5.6-.1 1.5.7 1.5h8.2c.8 0 1.2-.9.7-1.5l-.9-1.3c-.5-.6-.7-1.3-.7-2V4.8A3.2 3.2 0 0 0 8 1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M6.4 12.2a1.6 1.6 0 0 0 3.2 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [code, setCode] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  const [notifyOpen, setNotifyOpen] = useState(false);

  useEffect(() => {
    let stop = false;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: { code?: number } | null }) => {
        if (!stop) setCode(data.me?.code ?? null);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [pathname]);

  useEffect(() => {
    const onInbox = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      setUnread(detail?.unreadCount ?? 0);
    };
    window.addEventListener("node-inbox", onInbox);
    return () => window.removeEventListener("node-inbox", onInbox);
  }, []);

  // 경로 바뀌면 알림 패널 접기
  useEffect(() => {
    setNotifyOpen(false);
  }, [pathname]);

  const bare =
    pathname === "/" || pathname.startsWith("/join") || pathname === "/born" || pathname === "/show";
  if (bare) return null;

  return (
    <header className="top">
      <Link href={code ? "/my-node" : "/"} className="mark">
        cyp3 grove
      </Link>
      {code ? (
        <div className="top-actions">
          <button
            type="button"
            className="bell"
            aria-label={unread > 0 ? `알림 설정, 안 읽은 ${unread}` : "알림 설정"}
            aria-expanded={notifyOpen}
            onClick={() => setNotifyOpen((open) => !open)}
          >
            <Bell />
            {unread > 0 ? <i className="pip" /> : null}
          </button>
          <Link href="/my-node" className="me-code">
            {code}
          </Link>
        </div>
      ) : (
        <span />
      )}
      {code && notifyOpen ? (
        <div className="top-notify" role="dialog" aria-label="알림 받기">
          <p className="top-notify-lead">
            Add this to your home screen, then allow notifications on this phone.
          </p>
          <p className="ko">먼저 홈 화면에 넣고, 이어서 이 폰 알림을 켭니다. 텔레그램·이메일은 없습니다.</p>
          {/* 노드가 있을 때만 종 아이콘이 뜸 — 401 전에 권한 안 물음 */}
          <InstallCard place="join" />
          <Link className="top-notify-inbox" href="/inbox" onClick={() => setNotifyOpen(false)}>
            받은 메시지 보기
          </Link>
        </div>
      ) : null}
    </header>
  );
}
