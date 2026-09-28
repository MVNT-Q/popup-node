import { DEV_PERSONAS } from "./devPersonas";
import type { NodeRecord, Slot } from "./types";

/** 슬롯이 SEEK/OFFER/IMAGINE 모두 실답으로 채워졌는지 */
export function slotsComplete(slots: Slot[] | null | undefined): boolean {
  if (!slots || slots.length < 3) return false;
  return [0, 1, 2].every((i) => (slots[i]?.answer ?? "").trim().length >= 8);
}

function isLikelyPersonaSeed(node: NodeRecord): boolean {
  const persona = DEV_PERSONAS.find((p) => p.id === node.id);
  if (!persona) return false;
  const a = (node.slots[0]?.answer ?? "").trim();
  const b = (persona.slots[0]?.answer ?? "").trim();
  return a === b;
}

/** 짧은 실험·빈칸·에이전트 시드·페르소나 id 복제는 더티 */
export function isDirtyExperiment(node: NodeRecord): boolean {
  if (node.kind === "agent" || node.kind === "prop") return true;
  if (isLikelyPersonaSeed(node)) return false;
  if (!slotsComplete(node.slots)) return true;
  const seek = node.slots[0]?.answer?.trim() ?? "";
  const offer = node.slots[1]?.answer?.trim() ?? "";
  if (seek.length < 8 || offer.length < 8) return true;
  const junk = /^(test|테스트|asdf|aaa+|xxx+|바이브코더|인사이트)$/i;
  if (junk.test(seek) || junk.test(offer)) return true;
  return false;
}

/** 공개 그로브에 남길 실제 참가자 최대 5명 (랩 페르소나 id 제외). */
export function pickKeptReal(nodes: NodeRecord[], limit = 5): NodeRecord[] {
  const personaIds = new Set(DEV_PERSONAS.map((p) => p.id));
  return nodes
    .filter((node) => node.kind === "guest")
    .filter((node) => !personaIds.has(node.id))
    .filter((node) => !isLikelyPersonaSeed(node))
    .filter((node) => !isDirtyExperiment(node))
    .sort((a, b) => a.code - b.code || a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

export function personaRecords(now = new Date().toISOString()): NodeRecord[] {
  return DEV_PERSONAS.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    kind: "guest" as const,
    tag: null,
    slots: p.slots.map((slot) => ({ ...slot })),
    email: null,
    push: null,
    createdAt: now,
  }));
}
