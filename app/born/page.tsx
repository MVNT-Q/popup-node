"use client";

import { useEffect, useState } from "react";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { rememberNode } from "@/lib/nodePresence";
import { InstallCard } from "@/components/InstallCard";
import { MarkLock } from "@/components/MarkLock";

type Me = { code: number; name: string } | null;

export default function BornPage() {
  const [me, setMe] = useState<Me>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);

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
    if (sessionStorage.getItem("node-open-notify") !== "1") return;
    sessionStorage.removeItem("node-open-notify");
    setNotifyOpen(true);
  }, [me]);

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

      {notifyOpen ? (
        <div className="born-notify-layer" role="presentation">
          <div className="born-notify" role="dialog" aria-label="알림 활성화">
            <p className="top-notify-lead">
              Add this to your home screen, then allow notifications on this phone.
            </p>
            <p className="ko">먼저 홈 화면에 넣고, 이어서 이 폰 알림을 켭니다.</p>
            <InstallCard place="join" />
            <button className="text-btn" type="button" onClick={() => setNotifyOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
