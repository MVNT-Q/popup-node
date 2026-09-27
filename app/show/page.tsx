"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { ImagineTicker } from "@/components/ImagineTicker";
import { WordSphere } from "@/components/WordSphere";
import { layoutGrove } from "@/lib/constellation";
import type { Slot } from "@/lib/types";

type AllNode = { id: string; code: number; name: string; slots: Slot[] };
type Mode = "grove" | "collective";

export default function ShowPage() {
  const [all, setAll] = useState<AllNode[]>([]);
  const [edges, setEdges] = useState<{ a: string; b: string; questions: number[] }[]>([]);
  const [imagines, setImagines] = useState<string[]>([]);
  const [counts, setCounts] = useState({ nodes: 0, connections: 0 });
  const [mode, setMode] = useState<Mode>("grove");
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<Map<string, { x: number; y: number }> | null>(null);
  const laid = useRef(false);
  const touching = useRef(false);
  const collectiveSince = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/sky?view=show", { cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        all?: AllNode[];
        edges?: { a: string; b: string; questions: number[] }[];
        imagines?: string[];
        counts?: { nodes: number; connections: number };
      };
      if (!response.ok) throw new Error(data.error || "전시 화면을 열지 못했습니다.");
      if (stop) return;
      const nextAll = data.all ?? [];
      const nextEdges = data.edges ?? [];
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

  // 전시: 12초 교차. 만지는 동안 멈춤. 컬렉티브에 오래 머물면 그로브로.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (touching.current) return;
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

  const skyStars: SkyPoint[] = useMemo(() => {
    if (!layout) return [];
    return all.map((node) => {
      const point = layout.get(node.id) ?? { x: 500, y: 500 };
      return {
        id: node.id,
        code: node.code,
        name: node.name,
        x: point.x,
        y: point.y,
        // 전시는 개인 공명 없이 전부 비슷한 밝기. 일부만 플레어용 mid.
        band: node.code % 5 === 0 ? ("mid" as const) : ("weak" as const),
        selected: false,
      };
    });
  }, [all, layout]);

  const skyEdges: SkyEdge[] = useMemo(
    () => edges.map((edge) => ({ ...edge, bright: true })),
    [edges],
  );

  return (
    <main
      className="cyp cyp-sky-page cyp-grove cyp-show"
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
        <div>
          <p className="fine">cyp3 grove</p>
          <h1 className="cyp-sky-title">
            {counts.nodes} NODES · {counts.connections} CONNECTIONS
          </h1>
        </div>
      </header>

      {error ? <p className="cyp-error">{error}</p> : null}

      <div className={`cyp-grove-stage ${mode}`}>
        <div className={mode === "grove" ? "cyp-fade on" : "cyp-fade"}>
          {layout ? (
            <ConstellationSky stars={skyStars} edges={skyEdges} onPick={() => undefined} />
          ) : (
            <p className="hint center">불러오는 중</p>
          )}
        </div>
        <div className={mode === "collective" ? "cyp-fade on" : "cyp-fade"}>
          <div className="cyp-collective">
            <p className="fine">COLLECTIVE IMAGINATION</p>
            <p className="ko center">사람들이 쓴 상상의 말</p>
            <WordSphere imagines={imagines} />
          </div>
        </div>
      </div>

      <ImagineTicker lines={imagines} />
    </main>
  );
}
