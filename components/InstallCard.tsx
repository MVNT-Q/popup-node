"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { allowPhonePush, subscribePush, type PushLink } from "@/components/alerts";
import { isIos, isStandalone, listenInstall, promptInstall } from "@/components/install";

type Phase = "off" | "install" | "guide" | "notify" | "pending" | "linked";

export function InstallCard({ place = "join" }: { place?: "join" | "continue" }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("off");
  const [guide, setGuide] = useState<"ios" | "manual">("ios");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    listenInstall();

    async function look() {
      if (place === "continue" && window.location.pathname.startsWith("/join")) {
        if (!stop) setPhase("off");
        return;
      }
      const permission = "Notification" in window ? Notification.permission : "denied";
      if (permission === "granted") {
        const saved = await subscribePush();
        if (stop) return;
        if (saved === "push") {
          setPhase(place === "join" ? "linked" : "off");
          setNote("이 폰으로 알림이 연결됐습니다. 탭을 닫아도 옵니다.");
          return;
        }
        if (saved === "unauthorized") {
          setPhase(place === "join" ? "pending" : "off");
          setNote("알림 권한은 이 폰에 받았습니다. 노드로 들어가면 저장됩니다.");
          return;
        }
        if (saved === "no-push") {
          setNote("이 브라우저에는 폰 푸시가 없습니다. 폰 크롬, 또는 아이폰은 홈 화면 아이콘으로 연 뒤에 허용해야 붙습니다.");
          if (!isStandalone() && place === "join") {
            setGuide(isIos() ? "ios" : "manual");
            setPhase(isIos() ? "guide" : "install");
            return;
          }
          setPhase("pending");
          return;
        }
        setPhase("notify");
        setNote(
          saved === "local"
            ? "권한은 켜졌는데, 서버에 푸시 키가 없어 탭을 닫으면 끊깁니다."
            : "폰 구독이 아직 저장되지 않았습니다.",
        );
        return;
      }
      if (isStandalone()) {
        if (sessionStorage.getItem("node-push-later") === "1") {
          if (!stop) setPhase("off");
          return;
        }
        if (!stop) {
          setNote("");
          setPhase("notify");
        }
        return;
      }
      if (place === "join" && sessionStorage.getItem("node-install-later") === "1") {
        if (!stop) setPhase("off");
        return;
      }
      if (place === "continue") {
        if (!stop) setPhase("off");
        return;
      }
      if (!stop) {
        setGuide(isIos() ? "ios" : "manual");
        setPhase(isIos() ? "guide" : "install");
      }
    }

    void look();

    const onReady = () => {
      if (place === "continue" && window.location.pathname.startsWith("/join")) return;
      setPhase((current) => (current === "guide" && !isIos() ? "install" : current));
    };
    const onInstalled = () => {
      if (place === "continue" && window.location.pathname.startsWith("/join")) return;
      setPhase((current) => (current === "install" || current === "guide" ? "notify" : current));
      setNote("홈 화면에는 넣었습니다. 이어서 알림을 허용해 주세요.");
    };
    window.addEventListener("node-install-ready", onReady);
    window.addEventListener("node-installed", onInstalled);
    return () => {
      stop = true;
      window.removeEventListener("node-install-ready", onReady);
      window.removeEventListener("node-installed", onInstalled);
    };
  }, [place, pathname]);

  if (phase === "off") return null;

  function apply(link: PushLink) {
    if (link === "push") {
      setPhase(place === "join" ? "linked" : "off");
      setNote("이 폰으로 알림이 연결됐습니다. 탭을 닫아도 옵니다.");
      return;
    }
    if (link === "unauthorized") {
      setPhase(place === "join" ? "pending" : "notify");
      setNote("알림 권한은 이 폰에 받았습니다. 노드로 들어가면 저장됩니다.");
      return;
    }
    if (link === "denied") {
      setNote("알림을 거절하면 상단 종으로만 확인할 수 있습니다.");
      return;
    }
    if (link === "default") {
      setPhase("notify");
      setNote("홈 화면 다음은 알림입니다. 버튼을 한 번 더 눌러 주세요.");
      return;
    }
    if (link === "no-push") {
      setNote("이 브라우저에는 폰 푸시가 없습니다. 폰 크롬, 또는 아이폰은 홈 화면 아이콘으로 연 뒤에 허용해야 붙습니다.");
      if (!isStandalone() && place === "join") {
        setGuide(isIos() ? "ios" : "manual");
        setPhase(isIos() ? "guide" : "install");
        return;
      }
      setPhase("pending");
      return;
    }
    if (link === "local") {
      setPhase(place === "join" ? "linked" : "off");
      setNote("권한은 켜졌습니다. 이 서버에 푸시 키가 없어, 탭이 열려 있을 때만 옵니다.");
      return;
    }
    setPhase("notify");
    setNote("폰 구독이 저장되지 않았습니다. 한 번 더 눌러 주세요.");
  }

  async function next() {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      if (phase === "install") {
        const result = await promptInstall();
        if (result === "dismissed") {
          setNote("홈 화면에 추가해야 알림 연결로 넘어갑니다.");
          return;
        }
        if (result === "ios") {
          setGuide("ios");
          setPhase("guide");
          return;
        }
        if (result === "manual") {
          setGuide("manual");
          setPhase("guide");
          return;
        }
        setPhase("notify");
      }
      const link =
        "Notification" in window && Notification.permission === "granted" ? await subscribePush() : await allowPhonePush();
      apply(link);
    } finally {
      setBusy(false);
    }
  }

  const showButton = phase === "install" || phase === "notify";

  return (
    <section className={place === "continue" ? "install banner" : "install"}>
      {phase === "install" ? <p>먼저 홈 화면에 넣고, 이어서 이 폰 알림을 켭니다.</p> : null}
      {phase === "notify" ? <p>홈 화면 다음은 알림입니다. 여기서 허용해야 이 폰에 붙습니다.</p> : null}
      {phase === "guide" && guide === "ios" ? (
        <p>아이폰은 홈 화면에 넣기 전에는 알림이 폰에 안 붙습니다. 공유 → 홈 화면에 추가 → 그 아이콘으로 다시 열면, 알림 허용이 이어집니다.</p>
      ) : null}
      {phase === "guide" && guide === "manual" ? (
        <p>이 브라우저는 설치 창을 안 띄웁니다. 메뉴에서 홈 화면에 추가한 뒤, 그 아이콘으로 다시 여세요. 알림 허용은 그때 나옵니다.</p>
      ) : null}
      {phase === "pending" || phase === "linked" ? <p>{note}</p> : null}
      {showButton ? (
        <button className="btn-ghost" type="button" disabled={busy} onClick={() => void next()} style={{ marginTop: 10 }}>
          {busy ? "…" : phase === "install" ? "홈 화면에 추가" : "알림 허용"}
        </button>
      ) : null}
      {note && phase !== "pending" && phase !== "linked" ? <p className="hint">{note}</p> : null}
      {phase === "install" || phase === "guide" || phase === "notify" ? (
        <button
          className="text-btn"
          type="button"
          onClick={() => {
            if (phase === "notify") sessionStorage.setItem("node-push-later", "1");
            else sessionStorage.setItem("node-install-later", "1");
            setPhase("off");
          }}
        >
          나중에
        </button>
      ) : null}
    </section>
  );
}
