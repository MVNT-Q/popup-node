"use client";

import { useEffect, useState } from "react";
import { GroveBackdrop } from "@/components/GroveBackdrop";

type Me = { code: number; name: string } | null;

export default function BornPage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: Me }) => setMe(data.me ?? null))
      .catch(() => setMe(null));
  }, []);

  const code = me ? String(me.code).padStart(3, "0") : "—";

  return (
    <main className="cyp born">
      <GroveBackdrop />
      <p className="kicker">CYP3 | PROOF OF COEXISTENCE EXPERIMENT - 001</p>
      <div className="mark-lock" aria-hidden>
        <svg viewBox="0 0 120 120">
          <polygon points="60,8 104,34 104,86 60,112 16,86 16,34" fill="none" stroke="#1cff8a" strokeWidth="1" />
          <polygon points="60,28 88,44 88,76 60,92 32,76 32,44" fill="none" stroke="#7dffb4" strokeWidth="1" />
          <circle cx="60" cy="60" r="4" fill="#1cff8a" />
        </svg>
      </div>
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
      <a className="cyp-btn" href="/grove">
        <span>
          EXPLORE THE NODE GROVE <i aria-hidden>→</i>
        </span>
        <small>노드 그로브 탐색하기</small>
      </a>
    </main>
  );
}
