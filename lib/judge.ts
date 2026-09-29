import { createHash } from "crypto";
import { getJudge, listJudges, setJudge } from "./store";
import type { NodeRecord } from "./types";

export type JudgeScores = { seek: number; offer: number; imagine: number };

type GroveCache = {
  key: string;
  pairs: Map<string, JudgeScores>;
  complete: boolean;
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
const CRITERIA_VERSION = "criteria-v14";

/** 쌍 점수 저장. 기준 버전이 바뀌면 이 키가 달라져 전체를 다시 본다. */
const PAIR_STORE = `grove-pairs:${CRITERIA_VERSION}`;

/** How many unordered pairs one completion must score (small → no omission / lazy zeros). */
const PAIR_BATCH = 8;

const ASK_CONCURRENCY = 3;

function nodeBody(node: NodeRecord) {
  const answers = answersOf(node);
  const seekKinds = kindsOf(node, 0).join(",");
  const offerKinds = kindsOf(node, 1).join(",");
  return `${answers.join("\n")}|seekKinds:${seekKinds}|offerKinds:${offerKinds}`;
}

function nodeStamp(node: NodeRecord) {
  return createHash("sha256").update(nodeBody(node)).digest("hex").slice(0, 16);
}

function groveMemoryKey(nodes: NodeRecord[]) {
  const body = nodes
    .map((node) => `${node.id}:${nodeStamp(node)}`)
    .sort()
    .join("\n");
  return `${CRITERIA_VERSION}\n${body}`;
}

/** 예전 전체 지문. 기준을 안 바꾼 현재 그로브 캐시를 한 번 이어 받을 때만 쓴다. */
function fingerprint(nodes: NodeRecord[]) {
  const body = nodes
    .map((node) => `${node.id}|${nodeBody(node)}`)
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

function normText(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function isEmptySeek(text: string) {
  const t = normText(text);
  return !t || t === "nobody" || t === "no one" || t === "no-one" || t === "none";
}

function isVagueImagine(text: string) {
  const t = normText(text);
  return (
    !t ||
    t === "world" ||
    t === "everyone happy" ||
    t === "good world" ||
    t === "happy world" ||
    t === "모두가 행복" ||
    t === "모두 행복"
  );
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

function chunkPairs(pairs: [string, string][], size: number) {
  const out: [string, string][][] = [];
  for (let i = 0; i < pairs.length; i += size) out.push(pairs.slice(i, i + size));
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

/** Shared content words for SEEK/OFFER near-copies. Not used for IMAGINE. */
function tokenFit(left: string, right: string): number {
  const stop = new Set([
    "같이",
    "사람",
    "세상",
    "미래",
    "기술",
    "행복",
    "하고",
    "싶은",
    "싶음",
    "있는",
    "없는",
    "및",
    "또는",
    "the",
    "and",
    "for",
    "with",
    "need",
    "want",
    "help",
    "people",
    "person",
    "community",
    "creative",
    "future",
    "world",
    "better",
    "good",
    "happy",
    "tech",
    "technology",
    "network",
    "networking",
  ]);
  const toks = (text: string) =>
    normText(text)
      .split(/[\s,/·|,]+/)
      .map((t) => t.replace(/[만와과을를이가요]$/u, ""))
      .filter((t) => t.length >= 2 && !stop.has(t));
  const a = toks(left);
  const b = toks(right);
  if (!a.length || !b.length) return 0;
  let strong = 0;
  for (const t of a) {
    for (const u of b) {
      if (t === u || t.includes(u) || u.includes(t)) {
        if (Math.min(t.length, u.length) >= 2) strong += 1;
        break;
      }
    }
  }
  // Two+ shared content tokens = near-copy mid/strong. One vague word is not a line.
  if (strong >= 3) return 0.9;
  if (strong >= 2) return 0.6;
  return 0;
}

/** Contiguous overlap for SEEK/OFFER (tokens allowed as fallback). */
function phraseFit(left: string, right: string): number {
  const a = normText(left);
  const b = normText(right);
  if (!a || !b) return 0;
  if (a === b) return 0.9;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 6 && longer.includes(shorter)) return 0.9;
  for (let len = Math.min(shorter.length, 16); len >= 8; len -= 1) {
    for (let i = 0; i <= shorter.length - len; i += 1) {
      if (longer.includes(shorter.slice(i, i + len))) return 0.9;
    }
  }
  for (let i = 0; i <= shorter.length - 6; i += 1) {
    if (longer.includes(shorter.slice(i, i + 6))) return 0.6;
  }
  return tokenFit(left, right);
}

/**
 * IMAGINE lexical boost: identical text only.
 * Near-copy / short meaning matches go to the model — no character minimum.
 */
function imagineFit(left: string, right: string): number {
  if (isVagueImagine(left) || isVagueImagine(right)) return 0;
  const a = normText(left);
  const b = normText(right);
  if (!a || !b) return 0;
  if (a === b) return 0.9;
  return 0;
}

/**
 * Identical / near-copy SEEK/OFFER (and identical IMAGINE) without trusting a busy completion.
 * Nobody SEEK opts out of seek/offer for that pair — IMAGINE can still match.
 */
function lexicalScores(a: NodeRecord, b: NodeRecord): JudgeScores {
  const left = answersOf(a);
  const right = answersOf(b);
  if (isEmptySeek(left[0]) || isEmptySeek(right[0])) {
    return { seek: 0, offer: 0, imagine: imagineFit(left[2], right[2]) };
  }
  const seek = phraseFit(left[0], right[1]);
  const offer = phraseFit(left[1], right[0]);
  const imagine = imagineFit(left[2], right[2]);
  return { seek, offer, imagine };
}

function applyLexicalMatches(
  nodes: NodeRecord[],
  pairs: Map<string, JudgeScores>,
  only?: Set<string>,
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const [aId, bId] of unorderedPairs(nodes.map((node) => node.id))) {
    const key = pairKey(aId, bId);
    if (only && !only.has(key)) continue;
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (!a || !b) continue;
    const left = answersOf(a);
    const right = answersOf(b);
    const hit = lexicalScores(a, b);
    if (hit.seek || hit.offer || hit.imagine) {
      storeDirected(pairs, aId, bId, hit.seek, hit.offer, hit.imagine);
    }
    const cur = pairs.get(key) ?? { seek: 0, offer: 0, imagine: 0 };
    // Keep LLM IMAGINE meaning scores; identical text only boosts, never wipes.
    let imagine = Math.max(cur.imagine, hit.imagine);
    if (isVagueImagine(left[2]) || isVagueImagine(right[2])) imagine = 0;
    // Nobody SEEK: no seek/offer lines for this pair; do not clear a real IMAGINE hit.
    if (isEmptySeek(left[0]) || isEmptySeek(right[0])) {
      pairs.set(key, { seek: 0, offer: 0, imagine });
      continue;
    }
    pairs.set(key, {
      seek: Math.max(cur.seek, hit.seek),
      offer: Math.max(cur.offer, hit.offer),
      imagine,
    });
  }
}

function parsePairs(raw: string, ids: Set<string>) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return new Map<string, JudgeScores>();
  let json: {
    pairs?: { a?: string; b?: string; seek?: number; offer?: number; imagine?: number }[];
  };
  try {
    json = JSON.parse(raw.slice(start, end + 1)) as typeof json;
  } catch {
    return new Map<string, JudgeScores>();
  }
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

function parseStamped(raw: string, stamps: Map<string, string>) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return new Map<string, JudgeScores>();
  let json: {
    pairs?: {
      a?: string;
      b?: string;
      seek?: number;
      offer?: number;
      imagine?: number;
      ha?: string;
      hb?: string;
    }[];
  };
  try {
    json = JSON.parse(raw.slice(start, end + 1)) as typeof json;
  } catch {
    return new Map<string, JudgeScores>();
  }
  const pairs = new Map<string, JudgeScores>();
  for (const row of json.pairs ?? []) {
    if (!row.a || !row.b || row.a === row.b) continue;
    const ha = stamps.get(row.a);
    const hb = stamps.get(row.b);
    if (!ha || !hb || row.ha !== ha || row.hb !== hb) continue;
    storeDirected(pairs, row.a, row.b, clampScore(row.seek), clampScore(row.offer), clampScore(row.imagine));
  }
  return pairs;
}

function idsInPairs(pairs: Map<string, JudgeScores>) {
  const ids = new Set<string>();
  for (const key of pairs.keys()) {
    const sep = key.indexOf("\0");
    ids.add(key.slice(0, sep));
    ids.add(key.slice(sep + 1));
  }
  return ids;
}

/** 기준 v14로 저장해 둔, Joey가 들어오기 전 그로브. 키가 그 인원 지문과 같을 때만 쓴다. */
async function adoptBeforeJoey(nodes: NodeRecord[], joeyIds: Set<string>) {
  const ids = new Set(nodes.map((node) => node.id));
  const rows = await listJudges().catch(() => []);
  let best: Map<string, JudgeScores> | null = null;
  let bestCount = 0;
  for (const row of rows) {
    if (row.k === PAIR_STORE) continue;
    let parsed: Map<string, JudgeScores>;
    try {
      parsed = parsePairs(row.v, ids);
    } catch {
      continue;
    }
    if (!parsed.size) continue;
    const found = idsInPairs(parsed);
    if ([...found].some((id) => joeyIds.has(id))) continue;
    const subset = nodes.filter((node) => found.has(node.id));
    if (subset.length < found.size || subset.length < 2) continue;
    if (row.k !== fingerprint(subset)) continue;
    if (found.size <= bestCount) continue;
    best = parsed;
    bestCount = found.size;
  }
  return best ?? new Map<string, JudgeScores>();
}

function lockKnownLines(nodes: NodeRecord[], joeyIds: Set<string>) {
  const byName = new Map(nodes.map((node) => [node.name.trim().toLowerCase(), node]));
  const pairs = new Map<string, JudgeScores>();
  const put = (left: string, right: string, seek: number, offer: number, imagine: number) => {
    const a = byName.get(left);
    const b = byName.get(right);
    if (!a || !b || joeyIds.has(a.id) || joeyIds.has(b.id)) return;
    storeDirected(pairs, a.id, b.id, seek, offer, imagine);
  };
  // 6cc01c9에서 확인한 네 줄. 질문 번호는 code가 앞인 사람 기준.
  put("juhree", "leo", 0, 0.6, 0);
  put("juhree", "syon", 0, 0.6, 0);
  put("leo", "syon", 0.6, 0.6, 0);
  put("syon", "dohan", 0.6, 0, 0.6);
  const keepIds = nodes.filter((node) => !joeyIds.has(node.id)).map((node) => node.id);
  for (const [a, b] of unorderedPairs(keepIds)) {
    const key = pairKey(a, b);
    if (!pairs.has(key)) pairs.set(key, { seek: 0, offer: 0, imagine: 0 });
  }
  return pairs;
}

function serializeStamped(pairs: Map<string, JudgeScores>, stamps: Map<string, string>) {
  const rows: {
    a: string;
    b: string;
    seek: number;
    offer: number;
    imagine: number;
    ha: string;
    hb: string;
  }[] = [];
  for (const [key, scores] of pairs) {
    const sep = key.indexOf("\0");
    const a = key.slice(0, sep);
    const b = key.slice(sep + 1);
    const ha = stamps.get(a);
    const hb = stamps.get(b);
    if (!ha || !hb) continue;
    rows.push({ a, b, seek: scores.seek, offer: scores.offer, imagine: scores.imagine, ha, hb });
  }
  return JSON.stringify({ locked: true, pairs: rows });
}

function storeIsLocked(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return false;
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as { locked?: boolean };
    return json.locked === true;
  } catch {
    return false;
  }
}

async function askOnce(nodes: NodeRecord[], requiredPairs: [string, string][]) {
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
            "You match people at a gathering by concrete meaning. Matching is OR across axes — one direction is enough.",
            "SEEK is what they look for. OFFER is what they can give. IMAGINE is the future life they want.",
            "For each required pair (a,b): seek = a SEEK vs b OFFER; offer = a OFFER vs b SEEK; imagine = both IMAGINE.",
            "A line needs the written sentences to name the same concrete exchange: one side is looking for X and the other can actually do or give that X, OR both IMAGINE the same specific picture of life.",
            "Short text and Korean/English still count when that concrete X is clear — including near-identical SEEK/OFFER wording.",
            "Shared atmosphere alone is NOT a match (score 0): both \"tech\", both \"creative\", both \"community\", both \"a better future\", both \"people\", both hopeful, or vague networking without the same concrete X.",
            "Example of NOT a match: fashion/NFC/AI community experiment SEEK vs growth-hacking networking OFFER — related vibe, different X → 0.",
            "IMAGINE: same specific picture only. Same hopeful direction with different lives (existence questions vs AI takes labor vs people matter more) → 0.",
            "Vague backdrop (\"world\", \"good world\", \"everyone happy\", \"모두가 행복\") is imagine 0.",
            "Score 0.9 when the concrete fit is clear and strong. Score 0.6 when the concrete X fits. Score 0 when it does not. Never score 0.1–0.39 to \"almost\" — use 0 or 0.6+.",
            "A match on ANY ONE axis is enough (OR, not AND). Do NOT require both seek and offer. Do NOT require imagine on top of a seek/offer hit.",
            "seekKinds / offerKinds are chips (hints only, max four). They may weakly support when they agree with the sentences.",
            "Chips alone never become a line: if the sentences do not name the same concrete X, that axis is 0 even when chips overlap.",
            "If a sentence contradicts a chip, trust the sentence.",
            "Empty SEEK (Nobody / no one / blank): seek and offer for that pair are 0. Do not zero a real IMAGINE overlap just because SEEK is Nobody.",
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

/** Ask until every required pair has a model row. Omission must not become a silent 0. */
async function askComplete(
  nodes: NodeRecord[],
  requiredPairs: [string, string][],
  ids: Set<string>,
) {
  if (!requiredPairs.length) return new Map<string, JudgeScores>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let pending = requiredPairs;
  const merged = new Map<string, JudgeScores>();

  for (let attempt = 0; attempt < 3 && pending.length; attempt += 1) {
    const peopleIds = new Set<string>();
    for (const [a, b] of pending) {
      peopleIds.add(a);
      peopleIds.add(b);
    }
    const people = [...peopleIds].map((id) => byId.get(id)).filter(Boolean) as NodeRecord[];
    const raw = await askOnce(people, pending);
    const got = parsePairs(raw, ids);
    for (const [k, scores] of got) merged.set(k, mergeScore(merged.get(k), scores));
    pending = pending.filter(([a, b]) => !merged.has(pairKey(a, b)));
  }

  if (pending.length) {
    throw new Error(`매칭 판단 누락 ${pending.length}쌍`);
  }
  return merged;
}

function buildJobs(nodes: NodeRecord[], required: [string, string][]) {
  return chunkPairs(required, PAIR_BATCH).map((requiredPairs) => {
    const peopleIds = new Set<string>();
    for (const [a, b] of requiredPairs) {
      peopleIds.add(a);
      peopleIds.add(b);
    }
    const people = nodes.filter((node) => peopleIds.has(node.id));
    return { people, requiredPairs };
  });
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * 이미 판단된 쌍은 다시 묻지 않는다.
 * 새 사람, 또는 글을 고친 사람이 들어간 쌍만 본다.
 * 기준 버전을 올릴 때만 전체가 다시 열린다.
 */
export async function warmJudgments(nodes: NodeRecord[]): Promise<boolean> {
  if (!openaiKey() || nodes.length < 2) return false;
  const memoryKey = groveMemoryKey(nodes);
  if (memory?.complete && memory.key === memoryKey) return true;

  const stamps = new Map(nodes.map((node) => [node.id, nodeStamp(node)]));
  const ids = new Set(nodes.map((node) => node.id));
  const allPairs = unorderedPairs([...ids]);

  const joeyIds = new Set(
    nodes.filter((node) => node.name.trim().toLowerCase() === "joey").map((node) => node.id),
  );
  let kept = new Map<string, JudgeScores>();
  const saved = await getJudge(PAIR_STORE).catch(() => null);
  const locked = saved ? storeIsLocked(saved) : false;
  if (locked && saved) {
    kept = parseStamped(saved, stamps);
  } else {
    const adopted = await adoptBeforeJoey(nodes, joeyIds);
    kept = adopted.size ? adopted : lockKnownLines(nodes, joeyIds);
    for (const [a, b] of allPairs) {
      if (joeyIds.has(a) || joeyIds.has(b)) continue;
      const key = pairKey(a, b);
      if (!kept.has(key)) kept.set(key, { seek: 0, offer: 0, imagine: 0 });
    }
  }

  const missing = allPairs.filter(([a, b]) => !kept.has(pairKey(a, b)));
  if (!missing.length) {
    memory = { key: memoryKey, pairs: kept, complete: true };
    await setJudge(PAIR_STORE, serializeStamped(kept, stamps)).catch(() => undefined);
    return true;
  }

  try {
    const jobs = buildJobs(nodes, missing);
    const batchMaps = await mapPool(jobs, ASK_CONCURRENCY, (job) =>
      askComplete(job.people, job.requiredPairs, ids),
    );
    const fresh = new Map<string, JudgeScores>();
    for (const batch of batchMaps) {
      for (const [k, scores] of batch) {
        fresh.set(k, scores);
      }
    }
    const freshKeys = new Set<string>();
    for (const [a, b] of missing) {
      const key = pairKey(a, b);
      if (!fresh.has(key)) throw new Error("매칭 판단 불완전");
      freshKeys.add(key);
    }
    applyLexicalMatches(nodes, fresh, freshKeys);
    for (const [key, scores] of fresh) kept.set(key, scores);
    memory = { key: memoryKey, pairs: kept, complete: true };
    await setJudge(PAIR_STORE, serializeStamped(kept, stamps)).catch(() => undefined);
    return true;
  } catch {
    if (kept.size) {
      memory = { key: "", pairs: kept, complete: false };
      return true;
    }
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
