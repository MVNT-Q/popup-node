import { createHash } from "crypto";
import { getJudge, setJudge } from "./store";
import type { NodeRecord } from "./types";

export type JudgeScores = { seek: number; offer: number; imagine: number };

type GroveCache = {
  key: string;
  pairs: Map<string, JudgeScores>;
};

let memory: GroveCache | null = null;

/** Canonical unordered key (sorted ids). Scores are stored for the lower-id side as A. */
function pairKey(a: string, b: string) {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
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
const CRITERIA_VERSION = "criteria-v4";

/** Small enough that one completion can score every unordered pair in the group. */
const CHUNK_SIZE = 6;

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

function chunkNodes(nodes: NodeRecord[], size: number) {
  const out: NodeRecord[][] = [];
  for (let i = 0; i < nodes.length; i += size) out.push(nodes.slice(i, i + size));
  return out;
}

function unorderedPairs(ids: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i];
      const b = ids[j];
      out.push(a < b ? [a, b] : [b, a]);
    }
  }
  return out;
}

function crossPairs(leftIds: string[], rightIds: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (const left of leftIds) {
    for (const right of rightIds) {
      out.push(left < right ? [left, right] : [right, left]);
    }
  }
  return out;
}

function mergeScore(prev: JudgeScores | undefined, next: JudgeScores): JudgeScores {
  if (!prev) return next;
  return {
    seek: Math.max(prev.seek, next.seek),
    offer: Math.max(prev.offer, next.offer),
    imagine: Math.max(prev.imagine, next.imagine),
  };
}

/** Store scores with lower id as A: seek = A.SEEK vs B.OFFER, offer = A.OFFER vs B.SEEK. */
function storeDirected(
  pairs: Map<string, JudgeScores>,
  a: string,
  b: string,
  seek: number,
  offer: number,
  imagine: number,
) {
  if (a === b) return;
  if (a < b) {
    pairs.set(pairKey(a, b), mergeScore(pairs.get(pairKey(a, b)), { seek, offer, imagine }));
  } else {
    pairs.set(
      pairKey(a, b),
      mergeScore(pairs.get(pairKey(a, b)), { seek: offer, offer: seek, imagine }),
    );
  }
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
    storeDirected(
      pairs,
      row.a,
      row.b,
      clampScore(row.seek),
      clampScore(row.offer),
      clampScore(row.imagine),
    );
  }
  return pairs;
}

function serializePairs(pairs: Map<string, JudgeScores>) {
  const rows: { a: string; b: string; seek: number; offer: number; imagine: number }[] = [];
  for (const [key, scores] of pairs) {
    const sep = key.indexOf("\0");
    rows.push({
      a: key.slice(0, sep),
      b: key.slice(sep + 1),
      seek: scores.seek,
      offer: scores.offer,
      imagine: scores.imagine,
    });
  }
  return JSON.stringify({ pairs: rows });
}

async function ask(nodes: NodeRecord[], requiredPairs: [string, string][]) {
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
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You match people at a gathering by meaning. Matching is OR across axes — one direction is enough.",
            "SEEK is what they look for. OFFER is what they can give. IMAGINE is the future life they want.",
            "For each required pair (a,b): seek = a SEEK vs b OFFER; offer = a OFFER vs b SEEK; imagine = both IMAGINE.",
            "If one side can give what the other is looking for — even in a short or almost identical sentence — that direction is a match.",
            "Score 0.9 when nearly the same offer/seek (or identical/near-copy IMAGINE). Score 0.6 when it clearly fits. Score 0 when it does not.",
            "Include a match if ANY ONE axis fits (OR, not AND). Do NOT require both seek and offer. Do NOT require imagine on top of a seek/offer hit.",
            "Identical or near-copy IMAGINE sentences are a match. Vague backdrop only (\"world\", \"everyone happy\", \"good world\") is 0.",
            "Korean and English match when the meaning fits.",
            "seekKinds / offerKinds are chips: they support when they fit the sentences, but are not a free pass.",
            "If a sentence contradicts a chip, trust the sentence.",
            "Empty seekers (Nobody / no one / blank) do not match on seek/offer.",
            "You MUST return exactly one row for every entry in requiredPairs. Never omit a pair — use 0,0,0 if none of the three fit.",
            "Return JSON only: {\"pairs\":[{\"a\":\"id\",\"b\":\"id\",\"seek\":0,\"offer\":0,\"imagine\":0}]}.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify({ people, requiredPairs }) },
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

function buildJobs(nodes: NodeRecord[]) {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const groups = chunkNodes(sorted, CHUNK_SIZE);
  const jobs: { people: NodeRecord[]; requiredPairs: [string, string][] }[] = [];

  for (const group of groups) {
    if (group.length < 2) continue;
    jobs.push({
      people: group,
      requiredPairs: unorderedPairs(group.map((node) => node.id)),
    });
  }

  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      const left = groups[i];
      const right = groups[j];
      jobs.push({
        people: [...left, ...right],
        requiredPairs: crossPairs(
          left.map((node) => node.id),
          right.map((node) => node.id),
        ),
      });
    }
  }

  return jobs;
}

/** 이번 하늘 전체를 판단한다. 키가 없거나 실패하면 false. */
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
    const jobs = buildJobs(nodes);
    const raws = await Promise.all(jobs.map((job) => ask(job.people, job.requiredPairs)));
    const pairs = new Map<string, JudgeScores>();
    for (const raw of raws) {
      for (const [k, scores] of parsePairs(raw, ids)) {
        pairs.set(k, mergeScore(pairs.get(k), scores));
      }
    }
    // Every unordered pair must exist so omission cannot look like "never asked".
    for (const [a, b] of unorderedPairs([...ids])) {
      if (!pairs.has(pairKey(a, b))) pairs.set(pairKey(a, b), { seek: 0, offer: 0, imagine: 0 });
    }
    const merged = serializePairs(pairs);
    memory = { key, pairs };
    await setJudge(key, merged).catch(() => undefined);
    return true;
  } catch {
    memory = null;
    return false;
  }
}

/** warm이 끝난 뒤에만 점수를 준다. 없으면 null이라 기존 점수로 넘어간다. */
export function judgedScores(a: string, b: string): JudgeScores | null {
  if (!memory) return null;
  const stored = memory.pairs.get(pairKey(a, b));
  if (!stored) return { seek: 0, offer: 0, imagine: 0 };
  if (a < b) return stored;
  return { seek: stored.offer, offer: stored.seek, imagine: stored.imagine };
}
