"use client";

import { useMemo, useState } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { layoutGrove } from "@/lib/constellation";
import { DEV_PERSONAS } from "@/lib/devPersonas";
import { themeHits } from "@/lib/match";
import { midStrongHits, type HitLite } from "@/lib/relation";

export default function DevPage() {
  const [count, setCount] = useState(15);

  const { layout, skyStars, skyEdges, counts } = useMemo(() => {
    const people = DEV_PERSONAS.slice(0, Math.max(1, Math.min(15, count)));
    const answers = (id: string) => {
      const node = people.find((p) => p.id === id)!;
      return node.slots.map((slot) => slot.answer);
    };

    type Pair = { a: string; b: string; questions: number[]; hits: HitLite[] };
    const pairs: Pair[] = [];
    for (let i = 0; i < people.length; i += 1) {
      for (let j = i + 1; j < people.length; j += 1) {
        const left = people[i];
        const right = people[j];
        const ranked = themeHits(answers(left.id), answers(right.id), [0, 1, 2]);
        if (!ranked.hits.length) continue;
        pairs.push({
          a: left.id,
          b: right.id,
          questions: midStrongHits(ranked.hits).map((hit) => hit.questionIndex),
          hits: ranked.hits,
        });
      }
    }

    const solidEdges = pairs
      .filter((pair) => pair.questions.length > 0)
      .map((pair) => ({ a: pair.a, b: pair.b, questions: pair.questions }));

    const points = layoutGrove(
      people.map((p) => ({ id: p.id, code: p.code })),
      solidEdges,
    );

    const bandOf = (id: string): SkyPoint["band"] => {
      const linked = solidEdges.some((edge) => edge.a === id || edge.b === id);
      if (linked) return "mid";
      const weak = pairs.some(
        (pair) => (pair.a === id || pair.b === id) && pair.hits.some((h) => h.band === "weak"),
      );
      return weak ? "weak" : "dim";
    };

    const skyStars: SkyPoint[] = people.map((node) => {
      const point = points.get(node.id) ?? { x: 500, y: 500 };
      return {
        id: node.id,
        code: node.code,
        name: node.name,
        x: point.x,
        y: point.y,
        band: bandOf(node.id),
        selected: false,
      };
    });

    const skyEdges: SkyEdge[] = solidEdges.map((edge) => ({ ...edge, bright: true }));

    return {
      layout: points,
      skyStars,
      skyEdges,
      counts: { nodes: people.length, connections: solidEdges.length },
    };
  }, [count]);

  return (
    <main className="cyp cyp-sky-page cyp-grove cyp-dev">
      <GroveBackdrop />
      <header className="cyp-sky-head">
        <div className="cyp-sky-head-main">
          <p className="cyp-sky-kicker">DEV ONLY · MATCH LAB · NOT IN GROVE</p>
          <h1 className="cyp-sky-hero cyp-display">NODE GROVE</h1>
          <p className="cyp-sky-ko">매칭 별자리</p>
          <p className="cyp-sky-meta">
            {counts.nodes} NODES · {counts.connections} CONNECTIONS
          </p>
          <label className="cyp-dev-slider">
            <span>인원 {count}</span>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
            <input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setCount(Math.max(1, Math.min(15, Math.round(next))));
              }}
            />
          </label>
        </div>
      </header>

      <div className="cyp-grove-stage grove">
        <div className="cyp-fade on">
          {layout.size ? (
            <ConstellationSky stars={skyStars} edges={skyEdges} onPick={() => undefined} />
          ) : (
            <p className="hint center">…</p>
          )}
        </div>
      </div>
    </main>
  );
}
