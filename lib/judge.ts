import { createHash } from "crypto";
import { getJudge, setJudge } from "./store";
import type { NodeRecord } from "./types";

export type JudgeScores = { seek: number; offer: number; imagine: number };

type GroveCache = {
  key: string;
  pairs: Map<string, JudgeScores>;
};

let memory: GroveCache | null = null;

function pairKey(a: string, b: string) {
  return `${a}\0${b}`;
}

function openaiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

function answersOf(node: NodeRecord) {
  return [0, 1, 2].map((index) => (node.slots[index]?.answer ?? "").trim());
}

function kindsOf(node: NodeRecord, index: number) {
  const tags = node.slots[index]?.tags;
  if (!Array.isArray(tags) || !tags.length) return [] as string[];
  return tags.map((tag) => String(tag).trim()).filter(Boolean);
}

/** Bump when match criteria change so node_judge cache re-asks the model. */
const CRITERIA_VERSION = "criteria-v2";

function fingerprint(nodes: NodeRecord[]) {
  const body = nodes
    .map((node) => {
      const answers = answersOf(node);
      const seekKinds = kindsOf(node, 0).join(",");
      const offerKinds = kindsOf(node, 1).join(",");
      return `${node.id}|${answers.join("\n")}|seekKinds:${seekKinds}|offerKinds:${offerKinds}`;
    })
    .sort()
    .join("\n---\n");
  return createHash("sha256").update(`${CRITERIA_VERSION}\n${body}`).digest("hex").slice(0, 24);
}

function clampScore(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 0.8) return 0.88;
  if (n >= 0.4) return 0.6;
  return 0;
}

function parsePairs(raw: string, ids: Set<string>) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return new Map<string, JudgeScores>();
  const json = JSON.parse(raw.slice(start, end + 1)) as {
    pairs?: { a?: string; b?: string; seek?: number; offer?: number; imagine?: number }[];
  };
  const pairs = new Map<string, JudgeScores>();
  for (const row of json.pairs ?? []) {
    if (!row.a || !row.b || !ids.has(row.a) || !ids.has(row.b) || row.a === row.b) continue;
    pairs.set(pairKey(row.a, row.b), {
      seek: clampScore(row.seek),
      offer: clampScore(row.offer),
      imagine: clampScore(row.imagine),
    });
  }
  return pairs;
}

async function ask(nodes: NodeRecord[]) {
  const key = openaiKey();
  if (!key) throw new Error("OPENAI_API_KEY가 없습니다.");
  const model = process.env.OPENAI_MATCH_MODEL?.trim() || "gpt-4o-mini";
  const people = nodes.map((node) => {
    const answers = answersOf(node);
    return {
      id: node.id,
      seek: answers[0],
      seekKinds: kindsOf(node, 0),
      offer: answers[1],
      offerKinds: kindsOf(node, 1),
      imagine: answers[2],
    };
  });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You match people at a gathering by meaning, not by requiring long or ornate wording.",
            "SEEK is what they look for. OFFER is what they can give. IMAGINE is the future life they want.",
            "seek = A's SEEK vs B's OFFER: include when B can give what A is looking for.",
            "offer = A's OFFER vs B's SEEK: include when A can give what B is looking for.",
            "Short answers and near-identical wording still count: if one person needs X and the other can do X, that is a clear match.",
            "Example shape only (not real people): \"I need help soldering sensors\" ↔ \"I can help with circuit soldering and sensor wiring\".",
            "Korean and English match when the meaning fits.",
            "seekKinds / offerKinds are chips: they can support a match when they fit the sentences, but they are not a free pass.",
            "If a sentence contradicts a chip, trust the sentence.",
            "imagine = only when both want the same kind of life — not a vague shared backdrop like \"world\", \"everyone happy\", or \"good world\".",
            "Empty seekers (Nobody / no one / blank) do not match.",
            "Return JSON only: {\"pairs\":[{\"a\":\"id\",\"b\":\"id\",\"seek\":0,\"offer\":0,\"imagine\":0}]}.",
            "Include a pair when at least one of seek, offer, imagine fits.",
            "Score 0.9 when the meaning is clearly the same thing, 0.6 when it fits; omit axes that do not fit (use 0) and omit the pair only if none fit.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify({ people }) },
      ],
    }),
  });
  if (!response.ok) {
    await response.text().catch(() => "");
    throw new Error(`매칭 판단 실패 ${response.status}`);
  }
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

/** 이번 하늘 전체를 한 번만 판단한다. 키가 없거나 실패하면 false. */
export async function warmJudgments(nodes: NodeRecord[]): Promise<boolean> {
  if (!openaiKey() || nodes.length < 2) return false;
  const key = fingerprint(nodes);
  if (memory?.key === key) return true;

  const saved = await getJudge(key).catch(() => null);
  const ids = new Set(nodes.map((node) => node.id));
  if (saved) {
    try {
      memory = { key, pairs: parsePairs(saved, ids) };
      return true;
    } catch {
      memory = null;
    }
  }

  try {
    const raw = await ask(nodes);
    const pairs = parsePairs(raw, ids);
    memory = { key, pairs };
    await setJudge(key, raw).catch(() => undefined);
    return true;
  } catch {
    memory = null;
    return false;
  }
}

/** warm이 끝난 뒤에만 점수를 준다. 없으면 null이라 기존 점수로 넘어간다. */
export function judgedScores(a: string, b: string): JudgeScores | null {
  if (!memory) return null;
  return memory.pairs.get(pairKey(a, b)) ?? { seek: 0, offer: 0, imagine: 0 };
}
