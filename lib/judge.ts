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

function answersOf(node: NodeRecord) {
  return [0, 1, 2].map((index) => (node.slots[index]?.answer ?? "").trim());
}

function fingerprint(nodes: NodeRecord[]) {
  const body = nodes
    .map((node) => `${node.id}|${answersOf(node).join("\n")}`)
    .sort()
    .join("\n---\n");
  return createHash("sha256").update(body).digest("hex").slice(0, 24);
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
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY가 없습니다.");
  const model = process.env.OPENAI_MATCH_MODEL || "gpt-4o-mini";
  const people = nodes.map((node) => ({
    id: node.id,
    seek: answersOf(node)[0],
    offer: answersOf(node)[1],
    imagine: answersOf(node)[2],
  }));
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
            "You match people at a gathering by what they wrote.",
            "SEEK is what they are looking for. OFFER is what they can give. IMAGINE is the future they want to live in.",
            "Korean and English are the same when the meaning fits.",
            "seek = person A is looking for what person B can give.",
            "offer = person A can give what person B is looking for.",
            "imagine = their futures are actually the same kind of life.",
            "A short answer can be a full match when that is the whole point.",
            "Do not match people whose scenes only share a vague backdrop while the lives they describe are different.",
            "Return JSON only: {\"pairs\":[{\"a\":\"id\",\"b\":\"id\",\"seek\":0,\"offer\":0,\"imagine\":0}]}.",
            "Include a pair only when at least one of seek, offer, imagine is a real fit.",
            "Use 0.9 when it is clearly the same thing, 0.6 when it fits, and omit the pair otherwise.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify({ people }) },
      ],
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`매칭 판단 실패 ${response.status} ${body.slice(0, 180)}`);
  }
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

/** 이번 하늘 전체를 한 번만 판단한다. 키가 없거나 실패하면 false. */
export async function warmJudgments(nodes: NodeRecord[]): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY || nodes.length < 2) return false;
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
