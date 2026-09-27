"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { RelationSheet } from "@/components/RelationSheet";
import { layoutMyNode } from "@/lib/constellation";
import { midStrongHits, type HitLite } from "@/lib/relation";
import type { Slot } from "@/lib/types";

type Star = {
  id: string;
  code: number;
  name: string;
  band: "dim" | "weak" | "mid" | "strong";
  slots: Slot[];
  hits: HitLite[];
};

type Me = { id: string; code: number; name: string; slots: Slot[] };

const Q = [
  { key: "SEEK", index: 0 },
  { key: "OFFER", index: 1 },
  { key: "IMAGINE", index: 2 },
] as const;

export default function MyNodePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [edgesRaw, setEdgesRaw] = useState<{ a: string; b: string; questions: number[] }[]>([]);
  const [on, setOn] = useState<number[]>([0, 1, 2]);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<Map<string, { x: number; y: number }> | null>(null);

  const laid = useRef(false);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/sky?view=my", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      const data = (await response.json()) as {
        error?: string;
        me?: Me;
        stars?: Star[];
        edges?: { a: string; b: string; questions: number[] }[];
      };
      if (!response.ok) throw new Error(data.error || "내 노드를 열지 못했습니다.");
      if (stop) return;
      const nextMe = data.me ?? null;
      const nextStars = data.stars ?? [];
      const nextEdges = data.edges ?? [];
      setMe(nextMe);
      setStars(nextStars);
      setEdgesRaw(nextEdges);
      setError("");
      // 자리는 중·강 줄 합집합으로 한 번만.
      if (nextMe && !laid.current) {
        laid.current = true;
        setLayout(
          layoutMyNode(
            nextMe,
            nextStars.map((star) => ({ id: star.id, code: star.code })),
            nextEdges,
          ),
        );
      }
    }
    load().catch((reason) => {
      if (!stop) setError(reason instanceof Error ? reason.message : "내 노드를 열지 못했습니다.");
    });
    return () => {
      stop = true;
    };
  }, [router]);

  const points = layout;

  // 켜진 질문에 mid/strong 히트가 있는 별만 (합집합). 자리 고정, 보이기만 바꿈.
  const visibleStars = useMemo(() => {
    return stars.filter((star) => {
      const solid = midStrongHits(star.hits);
      if (!solid.length) return false;
      return solid.some((hit) => on.includes(hit.questionIndex));
    });
  }, [stars, on]);

  useEffect(() => {
    if (!picked || !me) return;
    if (picked === me.id) {
      setPicked(null);
      return;
    }
    if (!visibleStars.some((star) => star.id === picked)) setPicked(null);
  }, [picked, me, visibleStars]);

  const skyStars: SkyPoint[] = useMemo(() => {
    if (!me || !points) return [];
    const list: SkyPoint[] = [
      {
        id: me.id,
        code: me.code,
        name: me.name,
        x: points.get(me.id)?.x ?? 500,
        y: points.get(me.id)?.y ?? 500,
        band: "self",
        // 내 별은 포커스·선택 링 없이 항상 청록 self 크기
        selected: false,
      },
    ];
    for (const star of visibleStars) {
      const point = points.get(star.id);
      if (!point) continue;
      list.push({
        id: star.id,
        code: star.code,
        name: star.name,
        x: point.x,
        y: point.y,
        band: star.band,
        selected: picked === star.id,
      });
    }
    return list;
  }, [me, visibleStars, points, picked]);

  // 켜진 슬롯의 줄만. 안 켠 질문만으로 묶인 별·줄은 숨김.
  const skyEdges: SkyEdge[] = useMemo(() => {
    if (!me || !points) return [];
    const ids = new Set(skyStars.map((star) => star.id));
    return edgesRaw
      .map((edge) => {
        const qs = edge.questions.filter((q) => on.includes(q));
        return { ...edge, questions: qs, bright: qs.length > 0 };
      })
      .filter((edge) => edge.bright && ids.has(edge.a) && ids.has(edge.b));
  }, [edgesRaw, on, me, points, skyStars]);

  // 타인 별만 시트. 내 별은 골라지지 않음(청록 링만 유지).
  const pickedStar: Star | null = useMemo(() => {
    if (!me || !picked || picked === me.id) return null;
    return stars.find((star) => star.id === picked) ?? null;
  }, [me, picked, stars]);

  const codeLabel = me ? `#${String(me.code).padStart(3, "0")} / ${me.name}` : "";
  const resonance = stars.filter((star) => midStrongHits(star.hits).length > 0).length;

  function toggle(index: number) {
    setOn((prev) => {
      if (prev.includes(index)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== index);
      }
      return [...prev, index].sort();
    });
  }

  return (
    <main className="cyp cyp-sky-page cyp-my-node">
      <GroveBackdrop />
      <header className="cyp-sky-head">
        <div>
          <p className="fine">MY NODE / 나의 NODE</p>
          <h1 className="cyp-sky-title">{codeLabel || "…"}</h1>
          <p className="cyp-sky-meta">
            ACTIVE · {stars.length ? `${resonance} RESONANT` : "NO RESONANCE YET"}
          </p>
        </div>
      </header>

      <div className="cyp-qrow" role="group" aria-label="Questions">
        {Q.map((item) => (
          <button
            key={item.key}
            type="button"
            className={on.includes(item.index) ? "cyp-q on" : "cyp-q"}
            aria-pressed={on.includes(item.index)}
            onClick={() => toggle(item.index)}
          >
            {item.key}
          </button>
        ))}
      </div>

      {error ? <p className="cyp-error">{error}</p> : null}

      {!me ? (
        <p className="hint center">불러오는 중</p>
      ) : stars.length === 0 ? (
        <div className="cyp-empty">
          <p>No overlapping nodes yet.</p>
          <p className="ko">아직 공명하는 노드가 없습니다.</p>
          <p className="hint">Someone who overlaps you on SEEK, OFFER, or IMAGINE will appear here.</p>
        </div>
      ) : (
        <ConstellationSky
          stars={skyStars}
          edges={skyEdges}
          focusId={picked}
          onPick={(id) => {
            // 내 별은 청록 링만 — 정보 카드 열지 않음. 타인 별만 토글.
            if (me && id === me.id) return;
            setPicked((prev) => (prev === id ? null : id));
          }}
        />
      )}

      <nav className="cyp-sky-actions">
        <Link className="cyp-btn ghost" href="/signals">
          <span>MY SIGNALS</span>
          <small>내 시그널</small>
        </Link>
        <Link className="cyp-btn" href="/grove">
          <span>
            EXPLORE THE NODE GROVE <i aria-hidden>→</i>
          </span>
          <small>노드 그로브 탐색하기</small>
        </Link>
      </nav>

      {pickedStar && me ? (
        <RelationSheet
          meSlots={me.slots}
          theirSlots={pickedStar.slots}
          code={pickedStar.code}
          name={pickedStar.name}
          id={pickedStar.id}
          hits={pickedStar.hits}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </main>
  );
}
