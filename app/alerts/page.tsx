"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { InstallCard } from "@/components/InstallCard";
import { isStandalone } from "@/components/install";

export default function AlertsPage() {
  const [on, setOn] = useState<boolean | null>(null);
  const [home, setHome] = useState(false);

  useEffect(() => {
    setHome(isStandalone());
    setOn("Notification" in window && Notification.permission === "granted");
  }, []);

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
    </main>
  );
}
