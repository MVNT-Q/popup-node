"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { askNotification, subscribePush } from "@/components/alerts";
import { ExperimentKicker, GroveBackdrop } from "@/components/GroveBackdrop";

type Me = { id: string; code: number; name: string } | null;

export default function LandingPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [testAgents, setTestAgents] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me: Me; testAgents?: boolean; error?: string }) => {
        if (data.error) setError(data.error);
        setMe(data.me ?? null);
        setTestAgents(data.testAgents === true);
      })
      .catch(() => setError("세션을 읽지 못했습니다."));
  }, []);

  async function enterAgent(agent: "a" | "b") {
    setError("");
    setPending(agent);
    const perm = askNotification();
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "입장 실패");
      if (perm && (await perm) === "granted") await subscribePush();
      router.push("/my-node");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "입장 실패");
      setPending(null);
    }
  }

  return (
    <main className="cyp">
      <GroveBackdrop />
      <ExperimentKicker />
      <div className="mark-lock" aria-hidden>
        <svg viewBox="0 0 80 80">
          <polygon points="40,8 66,23 66,53 40,68 14,53 14,23" fill="none" stroke="#1cff8a" strokeWidth="1.2" />
          <polygon points="40,20 56,29 56,47 40,56 24,47 24,29" fill="none" stroke="#b8ffd8" strokeWidth="1" />
          <circle cx="40" cy="38" r="3" fill="#1cff8a" />
        </svg>
      </div>
      <h1 className="display">cyp3 grove</h1>
      <p className="display-sub">PROOF OF COEXISTENCE · EXPERIMENT 001</p>

      <div className="copy">
        <p>A network is just beginning to form.</p>
        <p className="ko">하나의 네트워크가 이제 막 형성되기 시작합니다.</p>
        <p>Not a platform. Not a nation. Not yet.</p>
        <p className="ko">플랫폼도, 국가도 아닙니다. 아직은.</p>
        <p>For four days, a temporary NODE GROVE will take shape here.</p>
        <p className="ko">4일 동안 이곳에는 하나의 임시적인 노드 그로브가 만들어집니다.</p>
        <p>
          People will connect not by where they come from, but by what they are seeking, what they can bring, and the
          futures they are willing to imagine together.
        </p>
        <p className="ko">
          사람들은 어디서 왔는지가 아니라, 무엇을 찾고 있는지, 무엇을 가져올 수 있는지, 그리고 어떤 미래를 함께
          상상할 수 있는지를 통해 연결됩니다.
        </p>
        <p className="lead-line">Become one of the first NODES.</p>
        <p className="ko">초기의 NODE 중 하나가 되어보세요.</p>
      </div>

      {me ? (
        <a className="cyp-btn" href="/my-node">
          <span>VIEW MY NODE</span>
          <small>내 노드 보기</small>
        </a>
      ) : (
        <a className="cyp-btn" href="/join">
          <span>
            BECOME A NODE <i aria-hidden>→</i>
          </span>
          <small>NODE가 되기</small>
        </a>
      )}

      <p className="fine">PSEUDONYMOUS · ~2 MIN · 4 DAY FIELD</p>
      <p className="status">
        <i /> NODE GROVE STATUS: FORMING
      </p>
      <p className="fine">ENTRY WINDOW ACTIVE</p>

      {testAgents ? (
        <div className="agent-row">
          <button type="button" disabled={pending !== null} onClick={() => void enterAgent("a")}>
            {pending === "a" ? "…" : "에이전트 A · 11"}
          </button>
          <button type="button" disabled={pending !== null} onClick={() => void enterAgent("b")}>
            {pending === "b" ? "…" : "에이전트 B · 12"}
          </button>
        </div>
      ) : null}
      {error ? <p className="cyp-error">{error}</p> : null}
    </main>
  );
}
