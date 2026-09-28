"use client";

import { useEffect, useState } from "react";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { rememberNode } from "@/lib/nodePresence";
import { MarkLock } from "@/components/MarkLock";

type Me = { code: number; name: string } | null;

export default function BornPage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: Me }) => {
        rememberNode(Boolean(data.me));
        setMe(data.me ?? null);
      })
      .catch(() => setMe(null));
  }, []);

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

    </main>
  );
}
