import { createHash } from "crypto";
import { picturedDimByName, settledGroveNames } from "./grovePicture";
import { getJudge, setJudge } from "./store";
import type { NodeRecord } from "./types";

const STORE_KEY = "arrival-v1";
const DIM_CAP = 5;

export type ArrivalEdge = {
  a: string;
  b: string;
  /** a 기준. 0 SEEK↔상대 OFFER, 1 OFFER↔상대 SEEK, 2 IMAGINE. */
  questions: number[];
  bright: boolean;
  arrival: true;
};

type Kind = "strong" | "potential" | "none";

type Row = {
  a: string;
  b: string;
  kind: Kind;
  questions: number[];
};

function answersOf(node: NodeRecord) {
  return [0, 1, 2].map((index) => (node.slots[index]?.answer ?? "").trim());
}

function stampOf(node: NodeRecord) {
  return createHash("sha256").update(answersOf(node).join("\n")).digest("hex").slice(0, 12);
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function banned(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length < 2) return true;
  return /i can offer anything|anything of items that need|^become nothing$|good energy and spirit|someone to collaborate|produce original ideas together|^freedom in life$|future,\s*designing something/i.test(
    t,
  );
}

function downgrade(row: Row, a: NodeRecord, b: NodeRecord): Row {
  if (row.kind === "none" || !row.questions.length) return { ...row, kind: "none", questions: [] };
  const left = answersOf(a);
  const right = answersOf(b);
  const kept: number[] = [];
  for (const question of row.questions) {
    const pair =
      question === 0
        ? [left[0], right[1]]
        : question === 1
          ? [left[1], right[0]]
          : [left[2], right[2]];
    if (banned(pair[0]) || banned(pair[1])) continue;
    kept.push(question);
  }
  if (!kept.length) return { ...row, kind: "none", questions: [] };
  return { ...row, questions: kept };
}

function openaiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

async function askModel(nodes: NodeRecord[], pairs: [string, string][]) {
  const key = openaiKey();
  if (!key || !pairs.length) return new Map<string, Row>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const people = [...new Set(pairs.flat())].map((id) => byId.get(id)).filter(Boolean) as NodeRecord[];
  const model = process.env.OPENAI_MATCH_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You connect one new person to existing people. Use only the written sentences.",
            "strong: SEEK and OFFER clearly complement in either direction, OR both IMAGINE the same concrete vision or the same clear values.",
            "Judge IMAGINE even when SEEK and OFFER do not match. A near-duplicate IMAGINE is strong.",
            "potential: a real written hook exists, but one side is thin or the fields are only related. Confidence is lower.",
            "none: no written basis. Do not match on shared mood words alone (people, future, community, creative, tech).",
            "These are not capabilities: anything, I can offer anything, become nothing, good energy, someone to collaborate, produce original ideas, freedom in life, future designing something.",
            "A vague slot does not count. Another slot on the same person can still justify potential.",
            "Do not invent a project or collaboration that is not written.",
            "questions are from a: 0 means a SEEK complements b OFFER, 1 means a OFFER complements b SEEK, 2 means IMAGINE.",
            "Return one row per required pair.",
            'JSON only: {"pairs":[{"a":"id","b":"id","kind":"strong|potential|none","questions":[2]}]}',
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            people: people.map((node) => {
              const answers = answersOf(node);
              return { id: node.id, seek: answers[0], offer: answers[1], imagine: answers[2] };
            }),
            requiredPairs: pairs,
          }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`신규 매칭 실패 ${response.status}`);
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as {
    pairs?: { a?: string; b?: string; kind?: string; questions?: number[] }[];
  };
  const out = new Map<string, Row>();
  const allowed = new Set(pairs.map(([a, b]) => pairKey(a, b)));
  for (const row of parsed.pairs ?? []) {
    if (!row.a || !row.b || !allowed.has(pairKey(row.a, row.b))) continue;
    const kind: Kind = row.kind === "strong" || row.kind === "potential" ? row.kind : "none";
    const questions = [...new Set((row.questions ?? []).filter((question) => question === 0 || question === 1 || question === 2))];
    out.set(pairKey(row.a, row.b), { a: row.a, b: row.b, kind, questions });
  }
  return out;
}

function select(rows: Row[], nodes: NodeRecord[]): ArrivalEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const dimName = picturedDimByName();
  const dim = new Map<string, number>();
  for (const node of nodes) {
    dim.set(node.id, dimName.get(node.name.trim().toLowerCase()) ?? 0);
  }
  const strong = rows.filter((row) => row.kind === "strong" && row.questions.length);
  const potential = rows
    .filter((row) => row.kind === "potential" && row.questions.length)
    .sort((left, right) => right.questions.length - left.questions.length || pairKey(left.a, left.b).localeCompare(pairKey(right.a, right.b)));
  const chosen: ArrivalEdge[] = strong.map((row) => ({
    a: row.a,
    b: row.b,
    questions: row.questions,
    bright: true,
    arrival: true,
  }));
  for (const row of potential) {
    if (!byId.has(row.a) || !byId.has(row.b)) continue;
    if ((dim.get(row.a) ?? 0) >= DIM_CAP || (dim.get(row.b) ?? 0) >= DIM_CAP) continue;
    dim.set(row.a, (dim.get(row.a) ?? 0) + 1);
    dim.set(row.b, (dim.get(row.b) ?? 0) + 1);
    chosen.push({ a: row.a, b: row.b, questions: row.questions, bright: false, arrival: true });
  }
  return chosen;
}

/**
 * LINKS에 없는 새 노드만 지금 기준으로 잇는다.
 * 선명한 줄은 개수 제한이 없다. 흐린 줄은 노드당 5개 이하.
 * criteria-v14 점수와 예전 글자 후보는 읽지 않는다.
 */
export async function arrivalLines(nodes: NodeRecord[]): Promise<ArrivalEdge[]> {
  const settled = settledGroveNames();
  const fresh = nodes.filter((node) => !settled.has(node.name.trim().toLowerCase()));
  if (!fresh.length || nodes.length < 2) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const pairs: [NodeRecord, NodeRecord][] = [];
  for (const node of fresh) {
    for (const other of nodes) {
      if (other.id === node.id) continue;
      const key = pairKey(node.id, other.id);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(node.id < other.id ? [node, other] : [other, node]);
    }
  }
  const saved = await getJudge(STORE_KEY).catch(() => null);
  let cached = new Map<string, Row & { ha: string; hb: string }>();
  if (saved) {
    try {
      const json = JSON.parse(saved) as { pairs?: (Row & { ha?: string; hb?: string })[] };
      cached = new Map(
        (json.pairs ?? [])
          .filter((row) => row.a && row.b && row.ha && row.hb)
          .map((row) => [pairKey(row.a, row.b), row as Row & { ha: string; hb: string }]),
      );
    } catch {
      cached = new Map();
    }
  }
  const rows: Row[] = [];
  const missing: [string, string][] = [];
  for (const [a, b] of pairs) {
    const hit = cached.get(pairKey(a.id, b.id));
    if (hit && hit.ha === stampOf(a) && hit.hb === stampOf(b)) {
      rows.push(downgrade(hit, a, b));
      continue;
    }
    missing.push([a.id, b.id]);
  }
  if (missing.length && openaiKey()) {
    try {
      const got = await askModel(nodes, missing);
      for (const [a, b] of missing) {
        const row = got.get(pairKey(a, b)) ?? { a, b, kind: "none" as Kind, questions: [] };
        const left = byId.get(a);
        const right = byId.get(b);
        rows.push(left && right ? downgrade(row, left, right) : row);
      }
      const stamped = rows
        .map((row) => {
          const left = byId.get(row.a);
          const right = byId.get(row.b);
          return left && right ? { ...row, ha: stampOf(left), hb: stampOf(right) } : null;
        })
        .filter(Boolean);
      await setJudge(STORE_KEY, JSON.stringify({ pairs: stamped })).catch(() => undefined);
    } catch {
      // 단어 수로 줄을 만들지 않는다.
    }
  }
  return select(rows, nodes);
}
