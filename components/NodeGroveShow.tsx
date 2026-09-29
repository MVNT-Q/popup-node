"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { ImagineTicker } from "@/components/ImagineTicker";
import { RelationSheet } from "@/components/RelationSheet";
import { SkyTitle } from "@/components/SkyTitle";
import { WordSphere } from "@/components/WordSphere";
import { layoutGrove } from "@/lib/constellation";
import type { HitLite } from "@/lib/relation";
import type { Slot } from "@/lib/types";

type AllNode = { id: string; code: number; name: string; slots: Slot[] };
type Me = { id: string; code: number; name: string; slots: Slot[] };
type Star = {
  id: string;
  hits: HitLite[];
  band?: "dim" | "weak" | "mid" | "strong";
};
type Mode = "grove" | "collective";

/** 전시 패드(/devshow)와 유저 보기(/usershow) 공통. 그로브 탭은 답변 카드. */
export function NodeGroveShow({ nav = false }: { nav?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [all, setAll] = useState<AllNode[]>([]);
  const [edges, setEdges] = useState<{ a: string; b: string; questions: number[] }[]>([]);
  const [imagines, setImagines] = useState<string[]>([]);
  const [counts, setCounts] = useState({ nodes: 0, connections: 0 });
  const [mode, setMode] = useState<Mode>("grove");
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<Map<string, { x: number; y: number }> | null>(null);
  const touching = useRef(false);
  const collectiveSince = useRef(0);
  const pickedRef = useRef<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  pickedRef.current = picked;

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/sky?view=show", { cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        me?: Me | null;
        stars?: Star[];
        all?: AllNode[];
        edges?: { a: string; b: string; questions: number[] }[];
        imagines?: string[];
        counts?: { nodes: number; connections: number };
      };
      if (!response.ok) throw new Error(data.error || "전시 화면을 열지 못했습니다.");
      if (stop) return;
      const nextAll = data.all ?? [];
      const nextEdges = data.edges ?? [];
      setMe(data.me ?? null);
      setStars(data.stars ?? []);
      setAll(nextAll);
      setEdges(nextEdges);
      setImagines(data.imagines ?? []);
      setCounts(data.counts ?? { nodes: 0, connections: 0 });
      setError("");
      // 폴링 합류도 새로고침과 같은 layoutGrove. laid 한 번만이면 신규가 (500,500)에 겹침.
      if (nextAll.length) {
        setLayout(layoutGrove(nextAll.map((n) => ({ id: n.id, code: n.code })), nextEdges));
      }
    }
    load().catch((reason) => {
      if (!stop) setError(reason instanceof Error ? reason.message : "전시 화면을 열지 못했습니다.");
    });
    const poll = window.setInterval(() => {
      load().catch(() => undefined);
    }, 30000);
    return () => {
      stop = true;
      window.clearInterval(poll);
    };
  }, []);

  // 전시 패드(/devshow)만 12초 교차. /usershow(nav)는 사용자가 고른 모드 유지.
  // 만지는 동안·노드 카드(picked) 열린 동안 멈춤. 컬렉티브에 오래 머물면 그로브로.
  useEffect(() => {
    if (nav) return;
    const timer = window.setInterval(() => {
      if (touching.current) return;
      if (pickedRef.current) return;
      if (modeRef.current === "collective") {
        const stayed = Date.now() - collectiveSince.current;
        if (stayed > 24000) {
          setMode("grove");
          return;
        }
      }
      setMode((prev) => {
        const next = prev === "grove" ? "collective" : "grove";
        if (next === "collective") collectiveSince.current = Date.now();
        return next;
      });
    }, 12000);
    return () => window.clearInterval(timer);
  }, [nav]);

  const skyStars: SkyPoint[] = useMemo(() => {
    if (!layout) return [];
    return all.map((node) => {
      const point = layout.get(node.id) ?? { x: 500, y: 500 };
      const against = stars.find((star) => star.id === node.id);
      // 청록 self는 이 브라우저 세션 쿠키의 노드만. 무세션·렌즈 노드는 초록.
      const self = Boolean(me && node.id === me.id);
      return {
        id: node.id,
        code: node.code,
        name: node.name,
        x: point.x,
        y: point.y,
        band: self ? "self" : against?.band && against.band !== "dim" ? against.band : "weak",
        selected: picked === node.id,
      };
    });
  }, [all, layout, me, picked, stars]);

  const skyEdges: SkyEdge[] = useMemo(
    () => edges.map((edge) => ({ ...edge, bright: true })),
    [edges],
  );

  const pickedNode = all.find((node) => node.id === picked) ?? null;
  const pickedHits = stars.find((star) => star.id === picked)?.hits ?? [];
  const emptySlots: Slot[] = [
    { question: "SEEK", answer: "" },
    { question: "OFFER", answer: "" },
    { question: "IMAGINE", answer: "" },
  ];

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <main
      className={`cyp cyp-sky-page cyp-grove cyp-show mode-${mode}${nav ? " cyp-usershow" : ""}`}
      onPointerDown={() => {
        touching.current = true;
      }}
      onPointerUp={() => {
        touching.current = false;
      }}
      onPointerCancel={() => {
        touching.current = false;
      }}
    >
      <GroveBackdrop />
      <header className="cyp-sky-head">
        {nav ? (
          <div className="cyp-show-nav" role="navigation" aria-label="Show navigation">
            <button type="button" className="cyp-show-nav-btn" onClick={goBack}>
              ← BACK
            </button>
            <Link href="/" className="cyp-show-nav-btn">
              HOME
            </Link>
          </div>
        ) : null}
        <SkyTitle mode={mode} nodes={counts.nodes} connections={counts.connections} />
      </header>

      {error ? <p className="cyp-error">{error}</p> : null}

      <div className={`cyp-grove-stage ${mode}`}>
        <div className={mode === "grove" ? "cyp-fade on" : "cyp-fade"}>
          {layout ? (
            <ConstellationSky
              stars={skyStars}
              edges={skyEdges}
              focusId={picked}
              onPick={(id) => {
                // 보이는 별은 전부 같은 정보 카드 — 내 별·약·고독 포함. 줄 유무와 무관.
                setMode("grove");
                setPicked((prev) => (prev === id ? null : id));
              }}
            />
          ) : (
            <p className="hint center">Loading…</p>
          )}
        </div>
        <div className={mode === "collective" ? "cyp-fade on" : "cyp-fade"}>
          <div className="cyp-collective">
            <WordSphere imagines={imagines} />
          </div>
        </div>
      </div>

      {!pickedNode ? <ImagineTicker lines={imagines} /> : null}

      {pickedNode ? (
        <RelationSheet
          variant="answers"
          meSlots={me?.slots ?? emptySlots}
          theirSlots={pickedNode.slots}
          code={pickedNode.code}
          name={pickedNode.name}
          id={pickedNode.id}
          hits={pickedHits}
          onClose={() => setPicked(null)}
        />
      ) : null}

      {/* 모드바는 시트보다 아래 DOM·더 높은 z — 홈 탭처럼 항상 맨 아래 */}
      <div
        className="cyp-mode-bar"
        role="tablist"
        aria-label="Grove mode"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "grove"}
          className={mode === "grove" ? "on" : ""}
          onClick={() => {
            touching.current = true;
            setPicked(null);
            setMode("grove");
          }}
        >
          <i aria-hidden />
          GROVE
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "collective"}
          className={mode === "collective" ? "on" : ""}
          onClick={() => {
            touching.current = true;
            setPicked(null);
            collectiveSince.current = Date.now();
            setMode("collective");
          }}
        >
          <i aria-hidden />
          COLLECTIVE IMAGINATION
        </button>
      </div>
    </main>
  );
}
