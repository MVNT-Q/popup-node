import type { Band, Slot } from "./types";

export type HitLite = {
  questionIndex: number;
  theirIndex: number;
  band: Band;
  score?: number;
  answer?: string;
};

export type RelationBlock = {
  key: "theyHelp" | "youHelp" | "shared";
  /** 관계 한 줄 — 토글 시 en/ko가 반드시 바뀜 */
  en: string;
  ko: string;
  /** 안내 한 줄 — 토글이 죽은 것처럼 보이지 않게 */
  hintEn: string;
  hintKo: string;
  /** 상대가 적은 원문. 번역 키 없으면 언어 그대로 */
  quote: string;
};

function clip(text: string, max = 96) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function slotAnswer(slots: Slot[], index: number) {
  return slots[index]?.answer?.trim() ?? "";
}

// 퍼센트 없이 세 줄. API 번역 없이 우리가 쓴 en/ko 쌍만 토글.
export function relationBlocks(meSlots: Slot[], theirSlots: Slot[], hits: HitLite[]): RelationBlock[] {
  const byQ = new Map(hits.map((hit) => [hit.questionIndex, hit]));

  const seek = byQ.get(0);
  const offer = byQ.get(1);
  const imagine = byQ.get(2);

  const theyOffer = seek
    ? clip(slotAnswer(theirSlots, seek.theirIndex) || seek.answer || slotAnswer(theirSlots, 1))
    : clip(slotAnswer(theirSlots, 1));
  const mySeek = clip(slotAnswer(meSlots, 0));
  const myOffer = clip(slotAnswer(meSlots, 1));
  const theirSeek = offer
    ? clip(slotAnswer(theirSlots, offer.theirIndex) || offer.answer || slotAnswer(theirSlots, 0))
    : clip(slotAnswer(theirSlots, 0));
  const myImagine = clip(slotAnswer(meSlots, 2));
  const theirImagine = imagine
    ? clip(slotAnswer(theirSlots, imagine.theirIndex) || imagine.answer || slotAnswer(theirSlots, 2))
    : clip(slotAnswer(theirSlots, 2));

  const theyHelpQuote =
    seek && theyOffer
      ? mySeek && mySeek !== theyOffer
        ? `${theyOffer} · ${mySeek}`
        : theyOffer
      : theyOffer;

  const youHelpQuote =
    offer && myOffer
      ? theirSeek && theirSeek !== myOffer
        ? `${myOffer} · ${theirSeek}`
        : myOffer
      : myOffer;

  const sharedQuote = imagine
    ? myImagine && theirImagine && myImagine !== theirImagine
      ? `${myImagine} · ${theirImagine}`
      : myImagine || theirImagine
    : "";

  return [
    {
      key: "theyHelp",
      en: seek && theyOffer ? "They can give what you seek" : "No matching offer for your seek",
      ko: seek && theyOffer ? "이 사람이 내가 찾는 걸 줄 수 있다" : "찾는 것과 맞닿는 제안이 없다",
      hintEn: "their offer · your seek",
      hintKo: "상대 제안 · 내가 찾는 것",
      quote: theyHelpQuote,
    },
    {
      key: "youHelp",
      en: offer && myOffer ? "They want what you can give" : "No matching seek for your offer",
      ko: offer && myOffer ? "내가 줄 수 있는 걸 이 사람이 원한다" : "제안과 맞닿는 찾음이 없다",
      hintEn: "your offer · their seek",
      hintKo: "내가 줄 수 있는 것 · 상대가 찾는 것",
      quote: youHelpQuote,
    },
    {
      key: "shared",
      en: imagine && sharedQuote ? "Our imaginations overlap" : "No shared imagination yet",
      ko: imagine && sharedQuote ? "상상이 겹친다" : "아직 겹치는 상상이 없다",
      hintEn: "shared imagining",
      hintKo: "겹치는 상상",
      quote: sharedQuote,
    },
  ];
}

export function hasAnyHit(hits: HitLite[]) {
  return hits.length > 0;
}

export function midStrongHits(hits: HitLite[]) {
  return hits.filter((hit) => hit.band === "mid" || hit.band === "strong");
}

export function brightestBand(hits: HitLite[]): Band | "dim" {
  if (hits.some((hit) => hit.band === "strong")) return "strong";
  if (hits.some((hit) => hit.band === "mid")) return "mid";
  if (hits.some((hit) => hit.band === "weak")) return "weak";
  return "dim";
}
