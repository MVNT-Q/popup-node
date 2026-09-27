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
  const me = id ? await getNode(id) : null;
  if (view !== "show" && !me) {
    return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  }

  const nodes = (await listNodes()).filter((node) => {
    if (!isFilled(node.slots)) return false;
    if (!showProps && node.kind !== "guest" && (!me || node.id !== me.id)) return false;
    return true;
  });

  let mode: "theme" | "embed" = "theme";
  const againstMe: {
    id: string;
    code: number;
    name: string;
    slots: NodeRecord["slots"];
    hits: HitOut[];
    band: Band | "dim";
  }[] = [];

  if (me) {
    for (const node of nodes) {
      if (node.id === me.id) continue;
      const ranked = await pairHits(me, node);
      mode = ranked.mode;
      const hits = ranked.hits;
      if (view === "my" && hits.length === 0) continue;
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
  } else if (me) {
    for (const star of againstMe) {
      const solid = midStrongHits(star.hits);
      if (!solid.length) continue;
      edges.push({
        a: me.id,
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
    me: me
      ? {
          id: me.id,
          code: me.code,
          name: me.name,
          slots: me.slots,
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
