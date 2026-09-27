"use client";

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

export default function ShowPage() {
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
  const laid = useRef(false);
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
      if (nextAll.length && !laid.current) {
        laid.current = true;
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

  // 전시: 12초 교차. 만지는 동안·관계 시트 읽는 동안 멈춤. 컬렉티브에 오래 머물면 그로브로.
  useEffect(() => {
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
  }, []);

  // 공개 그로브와 같은 노드·줄·밝기
  const skyStars: SkyPoint[] = useMemo(() => {
    if (!layout) return [];
    return all.map((node) => {
      const point = layout.get(node.id) ?? { x: 500, y: 500 };
      const against = stars.find((star) => star.id === node.id);
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

  return (
    <main
      className={`cyp cyp-sky-page cyp-grove cyp-show mode-${mode}`}
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
                if (me && id === me.id) {
                  router.push("/my-node");
                  return;
                }
                // 시트 열 때 콜렉티브로 자동 전환 금지 — 그로브 유지
                setMode("grove");
                setPicked(id);
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
