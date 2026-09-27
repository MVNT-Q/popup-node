"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { ImagineTicker } from "@/components/ImagineTicker";
import { RelationSheet } from "@/components/RelationSheet";
import { WordSphere } from "@/components/WordSphere";
import { layoutGrove } from "@/lib/constellation";
import type { HitLite } from "@/lib/relation";
import type { Slot } from "@/lib/types";

type Star = {
  id: string;
  code: number;
  name: string;
  band: "dim" | "weak" | "mid" | "strong";
  slots: Slot[];
  hits: HitLite[];
};

type AllNode = { id: string; code: number; name: string; slots: Slot[] };
type Me = { id: string; code: number; name: string; slots: Slot[] };
type Mode = "grove" | "collective";

export default function GrovePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [all, setAll] = useState<AllNode[]>([]);
  const [edges, setEdges] = useState<{ a: string; b: string; questions: number[] }[]>([]);
  const [imagines, setImagines] = useState<string[]>([]);
  const [counts, setCounts] = useState({ nodes: 0, connections: 0 });
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("grove");
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<Map<string, { x: number; y: number }> | null>(null);
  const laid = useRef(false);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/sky?view=grove", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      const data = (await response.json()) as {
        error?: string;
        me?: Me;
        stars?: Star[];
        all?: AllNode[];
        edges?: { a: string; b: string; questions: number[] }[];
        imagines?: string[];
        counts?: { nodes: number; connections: number };
      };
      if (!response.ok) throw new Error(data.error || "그로브를 열지 못했습니다.");
      if (stop) return;
      const nextMe = data.me ?? null;
      const nextAll = data.all ?? [];
      const nextEdges = data.edges ?? [];
      setMe(nextMe);
      setStars(data.stars ?? []);
      setAll(nextAll);
      setEdges(nextEdges);
      setImagines(data.imagines ?? []);
      setCounts(data.counts ?? { nodes: 0, connections: 0 });
      setError("");
      if (nextMe && nextAll.length && !laid.current) {
        laid.current = true;
        setLayout(layoutGrove(nextAll.map((n) => ({ id: n.id, code: n.code })), nextEdges));
      }
    }
    load().catch((reason) => {
      if (!stop) setError(reason instanceof Error ? reason.message : "그로브를 열지 못했습니다.");
    });
    return () => {
      stop = true;
    };
  }, [router]);

  const skyStars: SkyPoint[] = useMemo(() => {
    if (!me || !layout) return [];
    return all.map((node) => {
      const point = layout.get(node.id) ?? { x: 500, y: 500 };
      const against = stars.find((star) => star.id === node.id);
      const self = node.id === me.id;
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
  }, [me, all, layout, stars, picked]);

  const skyEdges: SkyEdge[] = useMemo(
    () => edges.map((edge) => ({ ...edge, bright: true })),
    [edges],
  );

  const pickedNode = all.find((node) => node.id === picked) ?? null;
  const pickedHits = stars.find((star) => star.id === picked)?.hits ?? [];

  return (
    <main className="cyp cyp-sky-page cyp-grove">
      <GroveBackdrop />
      <header className="cyp-sky-head">
        <div>
          <p className="fine">NODE GROVE / 노드 그로브</p>
          <h1 className="cyp-sky-title">
            {counts.nodes} NODES · {counts.connections} CONNECTIONS
          </h1>
        </div>
        <Link className="cyp-mini" href="/my-node">
          MY NODE
        </Link>
      </header>

      {error ? <p className="cyp-error">{error}</p> : null}

      <div className={`cyp-grove-stage ${mode}`}>
        <div className={mode === "grove" ? "cyp-fade on" : "cyp-fade"}>
          {layout && me ? (
            <ConstellationSky
              stars={skyStars}
              edges={skyEdges}
              onPick={(id) => {
                if (me && id === me.id) return;
                setPicked(id);
              }}
            />
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

      <div className="cyp-mode-toggle" role="tablist" aria-label="Grove mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "grove"}
          className={mode === "grove" ? "on" : ""}
          onClick={() => setMode("grove")}
        >
          GROVE
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "collective"}
          className={mode === "collective" ? "on" : ""}
          onClick={() => setMode("collective")}
        >
          COLLECTIVE IMAGINATION
        </button>
      </div>

      {pickedNode && me ? (
        <RelationSheet
          meSlots={me.slots}
          theirSlots={pickedNode.slots}
          code={pickedNode.code}
          name={pickedNode.name}
          id={pickedNode.id}
          hits={pickedHits}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </main>
  );
}
