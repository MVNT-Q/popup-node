import { warmJudgments } from "@/lib/judge";
import { rankAgainst } from "@/lib/rank";
import { brightestBand, midStrongHits } from "@/lib/relation";
import { readSessionId, testAgentsEnabled } from "@/lib/session";
import { isFilled } from "@/lib/slots";
import { getNode, listNodes, storageMissingMessage, storageReady } from "@/lib/store";
import type { Band, NodeRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HitOut = {
  questionIndex: number;
  theirIndex: number;
  band: Band;
  score: number;
  answer: string;
};

async function pairHits(a: NodeRecord, b: NodeRecord) {
  const ranked = await rankAgainst(a, b, [0, 1, 2]);
  return {
    mode: ranked.mode,
    hits: ranked.hits.map(
      (hit): HitOut => ({
        questionIndex: hit.questionIndex,
        theirIndex: hit.theirIndex,
        band: hit.band,
        score: hit.score,
        answer: hit.answer,
      }),
    ),
  };
}

export async function GET(request: Request) {
  if (!storageReady()) {
    return Response.json({ error: storageMissingMessage() }, { status: 503 });
  }
  const url = new URL(request.url);
  const viewParam = url.searchParams.get("view");
  const view = viewParam === "grove" || viewParam === "show" ? viewParam : "my";
  const showProps = testAgentsEnabled();

  const id = await readSessionId();
  const sessionMe = id ? await getNode(id) : null;
  if (view !== "show" && !sessionMe) {
    return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  }

  const nodes = (await listNodes()).filter((node) => {
    if (!isFilled(node.slots)) return false;
    if (!showProps && node.kind !== "guest" && (!sessionMe || node.id !== sessionMe.id)) return false;
    return true;
  });

  // /show 무세션: 카드 hits가 비면 SEEK/OFFER/IMAGINE 설명이 전부 빈다.
  // 가장 작은 code 노드를 렌즈로만 써서 관계 문장을 채운다 (전시장 태블릿).
  // 렌즈는 내 별이 아님 — me(응답·청록)는 세션 쿠키 노드만.
  const lens =
    sessionMe ??
    (view === "show" && nodes.length
      ? [...nodes].sort((a, b) => a.code - b.code || a.id.localeCompare(b.id))[0]
      : null);

  let mode: "theme" | "embed" | "llm" = (await warmJudgments(nodes)) ? "llm" : "theme";
  const againstMe: {
    id: string;
    code: number;
    name: string;
    slots: NodeRecord["slots"];
    hits: HitOut[];
    band: Band | "dim";
  }[] = [];

  if (lens) {
    for (const node of nodes) {
      if (node.id === lens.id) continue;
      const ranked = await pairHits(lens, node);
      mode = ranked.mode;
      const hits = ranked.hits;
      // /my-node: 중·강 겹침 있는 별만 (줄 없는 고독 별 숨김)
      if (view === "my" && midStrongHits(hits).length === 0) continue;
      againstMe.push({
        id: node.id,
        code: node.code,
        name: node.name,
        slots: node.slots,
        hits,
        band: brightestBand(hits),
      });
    }
  }

  // 그로브·전시: 모든 쌍의 중·강 줄. 약만 있으면 줄 없음.
  const edges: { a: string; b: string; questions: number[] }[] = [];
  if (view === "grove" || view === "show") {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const left = nodes[i];
        const right = nodes[j];
        const ranked = await pairHits(left, right);
        mode = ranked.mode;
        const solid = midStrongHits(ranked.hits);
        if (!solid.length) continue;
        edges.push({
          a: left.id,
          b: right.id,
          questions: solid.map((hit) => hit.questionIndex),
        });
      }
    }
  } else if (sessionMe) {
    for (const star of againstMe) {
      const solid = midStrongHits(star.hits);
      if (!solid.length) continue;
      edges.push({
        a: sessionMe.id,
        b: star.id,
        questions: solid.map((hit) => hit.questionIndex),
      });
    }
  }

  const imagines = nodes
    .map((node) => node.slots[2]?.answer?.trim() ?? "")
    .filter((text) => text.length >= 2);

  return Response.json({
    view,
    matcher: mode,
    me: sessionMe
      ? {
          id: sessionMe.id,
          code: sessionMe.code,
          name: sessionMe.name,
          slots: sessionMe.slots,
        }
      : null,
    stars: againstMe,
    all:
      view === "grove" || view === "show"
        ? nodes.map((node) => ({
            id: node.id,
            code: node.code,
            name: node.name,
            slots: node.slots,
          }))
        : undefined,
    edges,
    imagines,
    counts: {
      nodes: nodes.length,
      connections: edges.length,
      resonance: againstMe.filter((star) => midStrongHits(star.hits).length > 0).length,
    },
  });
}
