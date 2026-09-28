"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { rememberNode } from "@/lib/nodePresence";

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 2.2a3.1 3.1 0 0 0-3.1 3.1v2L3.4 9.4v.9h9.2v-.9L11.1 7.3v-2A3.1 3.1 0 0 0 8 2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M6.8 11.3a1.2 1.2 0 0 0 2.4 0" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M2.2 3.2h11.6v7.4H8.1L5.2 13v-2.4H2.2V3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [code, setCode] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let stop = false;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: { code?: number } | null }) => {
        if (stop) return;
        rememberNode(data.me?.code != null);
        setCode(data.me?.code ?? null);
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

  const bare =
    pathname === "/" ||
    pathname.startsWith("/join") ||
    pathname === "/born" ||
    pathname === "/show" ||
    pathname === "/devshow" ||
    pathname === "/usershow";
  if (bare) return null;

  const nodeLabel = code != null ? `#${String(code).padStart(3, "0")}` : null;

  return (
    <header className="top">
      <Link href={code ? "/my-node" : "/"} className="mark">
        cyp3 grove
      </Link>
      {code != null && nodeLabel ? (
        <div className="top-actions">
          <Link href="/alerts" className="bell" aria-label="Alerts">
            <BellIcon />
          </Link>
          <Link
            href="/inbox"
            className="bell"
            aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"}
          >
            <MessageIcon />
            {unread > 0 ? <i className="pip" /> : null}
          </Link>
          <Link href="/my-node" className="me-code">
            {nodeLabel}
          </Link>
        </div>
      ) : (
        <span />
      )}
    </header>
  );
}
