"use client";

import { useState } from "react";
import { InstallCard } from "@/components/InstallCard";

// 홈 화면 → 푸시 순서는 InstallCard 그대로. 하늘 안에서는 접어 둔다.
export function NotifyReveal() {
  const [open, setOpen] = useState(false);

  return (
    <div className="cyp-notify">
      <button className="cyp-btn ghost" type="button" onClick={() => setOpen((v) => !v)}>
        <span>
          NOTIFY ME <i aria-hidden>{open ? "↑" : "→"}</i>
        </span>
        <small>알림 받기</small>
      </button>
      {open ? (
        <div className="cyp-notify-panel">
          <InstallCard place="join" />
        </div>
      ) : null}
    </div>
  );
}
