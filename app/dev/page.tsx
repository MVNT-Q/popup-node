"use client";

import { useMemo } from "react";
import { ConstellationSky, type SkyEdge, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { layoutGrove } from "@/lib/constellation";
import { DEV_PERSONAS } from "@/lib/devPersonas";
import { themeHits } from "@/lib/match";
import { midStrongHits, type HitLite } from "@/lib/relation";

const SLOT = ["SEEK", "OFFER", "IMAGINE"] as const;

function clip(text: string, max = 72) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function whyLine(hits: HitLite[], theirName: string) {
  const solid = midStrongHits(hits);
  if (solid.length) {
    const bits = solid.map((hit) => {
      const mine = SLOT[hit.questionIndex] ?? "?";
      const theirs = SLOT[hit.theirIndex] ?? "?";
      return `${mine}↔${theirs}(${hit.band === "strong" ? "강" : "중"})`;
    });
    return `${theirName}: ${bits.join(", ")}`;
  }
  if (hits.some((hit) => hit.band === "weak")) {
    return `${theirName}: 약(별만)`;
  }
  return "";
}

export default function DevPage() {
  const { layout, edges, rows, skyStars, skyEdges, counts } = useMemo(() => {
    const answers = (id: string) => {
      const node = DEV_PERSONAS.find((p) => p.id === id)!;
      return node.slots.map((slot) => slot.answer);
    };

    type Pair = { a: string; b: string; questions: number[]; hits: HitLite[] };
    const pairs: Pair[] = [];
    for (let i = 0; i < DEV_PERSONAS.length; i += 1) {
      for (let j = i + 1; j < DEV_PERSONAS.length; j += 1) {
        const left = DEV_PERSONAS[i];
        const right = DEV_PERSONAS[j];
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
      DEV_PERSONAS.map((p) => ({ id: p.id, code: p.code })),
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

    const skyStars: SkyPoint[] = DEV_PERSONAS.map((node) => {
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

    const rows = DEV_PERSONAS.map((node) => {
      const links: string[] = [];
      let lonely = true;
      for (const pair of pairs) {
        if (pair.a !== node.id && pair.b !== node.id) continue;
        lonely = false;
        const otherId = pair.a === node.id ? pair.b : pair.a;
        const other = DEV_PERSONAS.find((p) => p.id === otherId)!;
        // themeHits는 A→B 방향. B→A도 같은 규칙으로 한 줄 설명을 만든다.
        const forward = themeHits(answers(node.id), answers(otherId), [0, 1, 2]);
        const line = whyLine(forward.hits, other.name);
        if (line) links.push(line);
      }
      return {
        name: node.name,
        seek: clip(node.slots[0]?.answer ?? ""),
        offer: clip(node.slots[1]?.answer ?? ""),
        imagine: clip(node.slots[2]?.answer ?? ""),
        why: lonely || !links.length ? "고독" : links.join(" · "),
      };
    });

    return {
      layout: points,
      edges: solidEdges,
      rows,
      skyStars,
      skyEdges,
      counts: { nodes: DEV_PERSONAS.length, connections: solidEdges.length },
    };
  }, []);

  return (
    <main className="cyp cyp-sky-page cyp-grove cyp-dev">
      <GroveBackdrop />
      <header className="cyp-sky-head">
        <div>
          <p className="fine">DEV ONLY · NOT IN GROVE</p>
          <h1 className="cyp-sky-hero">MATCH LAB</h1>
          <p className="cyp-sky-meta">
            {counts.nodes} PERSONAS · {counts.connections} CONNECTIONS (중+)
          </p>
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

      <div className="cyp-dev-table-wrap">
        <table className="cyp-dev-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>SEEK</th>
              <th>OFFER</th>
              <th>IMAGINE</th>
              <th>누구와 왜</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.seek}</td>
                <td>{row.offer}</td>
                <td>{row.imagine}</td>
                <td>{row.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
