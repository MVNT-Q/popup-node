"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { RelationSheet } from "@/components/RelationSheet";
import { layoutMyNode } from "@/lib/constellation";
import { GROVE_PICTURE, layoutGrovePicture, pictureEdges, pictureReasons } from "@/lib/grovePicture";
import { type HitLite } from "@/lib/relation";
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

type NodeCard = { id: string; code: number; name: string; slots: Slot[] };

type PictureEdge = { a: string; b: string; questions: number[]; bright: boolean };

const Q = [
  { key: "SEEK", index: 0 },
  { key: "OFFER", index: 1 },
  { key: "IMAGINE", index: 2 },
] as const;

export default function MyNodePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [all, setAll] = useState<NodeCard[]>([]);
  const [stars, setStars] = useState<Star[]>([]);
  const [edgesRaw, setEdgesRaw] = useState<PictureEdge[]>([]);
  const [on, setOn] = useState<number[]>([0, 1, 2]);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<Map<string, { x: number; y: number }> | null>(null);

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
        all?: NodeCard[];
        stars?: Star[];
        edges?: { a: string; b: string; questions: number[] }[];
      };
      if (!response.ok) throw new Error(data.error || "Could not open your node.");
      if (stop || !data.me) {
        if (!stop && !data.me) router.replace("/");
        return;
      }
      const nextMe = data.me;
      const nextAll = data.all ?? [];
      const nextStars = data.stars ?? [];
      const apiEdges = data.edges ?? [];
      // 전시 그림이 켜져 있으면 그로브와 같은 자리·같은 줄만. 나에게 붙은 줄만 남긴다.
      const mine: PictureEdge[] = GROVE_PICTURE
        ? pictureEdges(nextAll, apiEdges, nextMe.id).filter(
            (edge) => edge.a === nextMe.id || edge.b === nextMe.id,
          )
        : apiEdges
            .filter((edge) => edge.a === nextMe.id || edge.b === nextMe.id)
            .map((edge) => ({ ...edge, bright: true }));
      setMe(nextMe);
      setAll(nextAll);
      setStars(nextStars);
      setEdgesRaw(mine);
      setError("");
      setLayout(
        GROVE_PICTURE
          ? layoutGrovePicture(nextAll)
          : layoutMyNode(
              nextMe,
              nextStars.map((star) => ({ id: star.id, code: star.code })),
              mine,
            ),
      );
    }
    load().catch((reason) => {
      if (!stop) setError(reason instanceof Error ? reason.message : "Could not open your node.");
    });
    return () => {
      stop = true;
    };
  }, [router]);

  const points = layout;

  // 세 버튼이 다 켜지면 그림의 내 줄 전부. 하나만 누르면 그 질문 줄만.
  const visibleEdges = useMemo(() => {
    return edgesRaw.filter((edge) => {
      if (on.length === 3) return true;
      return edge.questions.some((question) => on.includes(question));
    });
  }, [edgesRaw, on]);

  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of visibleEdges) {
      ids.add(edge.a);
      ids.add(edge.b);
    }
    if (me) ids.delete(me.id);
    return ids;
  }, [visibleEdges, me]);

  useEffect(() => {
    if (!picked || !me) return;
    if (picked === me.id) {
      setPicked(null);
      return;
    }
    if (!neighborIds.has(picked)) setPicked(null);
  }, [picked, me, neighborIds]);

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
    for (const node of all) {
      if (!neighborIds.has(node.id)) continue;
      const point = points.get(node.id);
      if (!point) continue;
      const lit = visibleEdges.some(
        (edge) => edge.bright && (edge.a === node.id || edge.b === node.id),
      );
      list.push({
        id: node.id,
        code: node.code,
        name: node.name,
        x: point.x,
        y: point.y,
        band: lit ? "mid" : "dim",
        selected: picked === node.id,
      });
    }
    return list;
  }, [me, all, neighborIds, visibleEdges, points, picked]);

  const skyEdges: SkyEdge[] = useMemo(() => {
    if (!me || !points) return [];
    const ids = new Set(skyStars.map((star) => star.id));
    return visibleEdges
      .filter((edge) => ids.has(edge.a) && ids.has(edge.b))
      .map((edge) => ({
        a: edge.a,
        b: edge.b,
        questions: edge.questions.filter((question) => on.includes(question)),
        bright: edge.bright,
      }));
  }, [visibleEdges, on, me, points, skyStars]);

  // 타인 별만 시트. 내 별은 골라지지 않음(청록 링만 유지).
  const pickedNode = useMemo(() => {
    if (!me || !picked || picked === me.id) return null;
    return all.find((node) => node.id === picked) ?? null;
  }, [me, picked, all]);

  const pickedHits = useMemo(() => {
    if (!picked || !me) return [] as HitLite[];
    const stored = stars.find((star) => star.id === picked)?.hits ?? [];
    const other = all.find((node) => node.id === picked);
    const edge = edgesRaw.find(
      (item) => (item.a === me.id && item.b === picked) || (item.b === me.id && item.a === picked),
    );
    if (!other || !edge) return stored;
    const wanted = new Set(edge.questions);
    const covered = new Set(
      stored
        .filter((hit) => (hit.band === "mid" || hit.band === "strong") && wanted.has(hit.questionIndex))
        .map((hit) => hit.questionIndex),
    );
    const extra: HitLite[] = pictureReasons(me.name, other.name)
      .filter((hit) => wanted.has(hit.questionIndex) && !covered.has(hit.questionIndex))
      .map((hit) => ({
        questionIndex: hit.questionIndex,
        theirIndex: hit.theirIndex,
        quoteSlot: hit.theirIndex,
        band: "mid",
        answer: other.slots[hit.theirIndex]?.answer ?? "",
      }));
    return [...stored.filter((hit) => wanted.has(hit.questionIndex)), ...extra];
  }, [picked, me, stars, all, edgesRaw]);

  const codeLabel = me ? `#${String(me.code).padStart(3, "0")} / ${me.name}` : "";
  const resonance = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of edgesRaw) {
      ids.add(edge.a);
      ids.add(edge.b);
    }
    if (me) ids.delete(me.id);
    return ids.size;
  }, [edgesRaw, me]);

  // 기본 셋 다 켜짐. 하나를 누르면 그 슬롯만 남김(줄이 바뀌게). 다시 누르면 셋 복구. 꺼진 슬롯을 누르면 합집합에 추가.
  function toggle(index: number) {
    setOn((prev) => {
      if (prev.length === 3) return [index];
      if (prev.length === 1 && prev[0] === index) return [0, 1, 2];
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
          <p className="fine">MY NODE</p>
          <h1 className="cyp-sky-title">{codeLabel || "…"}</h1>
          <p className="cyp-sky-meta">
            ACTIVE · {resonance ? `${resonance} RESONANT` : "NO RESONANCE YET"}
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
        <p className="hint center">Loading…</p>
      ) : (
        <>
          {/* 중·강 타인 없음: 문장만. 내 별(me)은 아래 하늘에 항상 그림 */}
          {resonance === 0 ? (
            <div className="cyp-empty cyp-empty-with-self">
              <p>No overlapping nodes yet.</p>
              <p className="hint">Someone who overlaps you on SEEK, OFFER, or IMAGINE will appear here.</p>
            </div>
          ) : null}
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
        </>
      )}

      <nav className="cyp-sky-actions">
        <Link className="cyp-btn ghost" href="/signals">
          MY SIGNALS
        </Link>
        <Link className="cyp-btn" href="/usershow">
          EXPLORE THE NODE GROVE <i aria-hidden>→</i>
        </Link>
      </nav>

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
