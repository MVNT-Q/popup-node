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
  en: string;
  ko: string;
  line: string;
};

function clip(text: string, max = 96) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function slotAnswer(slots: Slot[], index: number) {
  return slots[index]?.answer?.trim() ?? "";
}

// 퍼센트 없이 세 줄. 키가 없어도 겹친 구절을 그대로 둔다.
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

  // 모델 키 없이: 겹친 구절을 그대로 한 줄로. 비우지 않는다.
  const theyHelpLine =
    seek && theyOffer
      ? mySeek && mySeek !== theyOffer
        ? `${theyOffer} · ${mySeek}`
        : theyOffer
      : theyOffer || "No overlapping offer for your seek. / 찾는 것과 맞닿는 제안이 없다.";

  const youHelpLine =
    offer && myOffer
      ? theirSeek && theirSeek !== myOffer
        ? `${myOffer} · ${theirSeek}`
        : myOffer
      : myOffer || "No overlapping seek for your offer. / 제안과 맞닿는 찾음이 없다.";

  const sharedLine = imagine
    ? myImagine && theirImagine && myImagine !== theirImagine
      ? `${myImagine} · ${theirImagine}`
      : myImagine || theirImagine
    : "No shared imagination yet. / 아직 겹치는 상상이 없다.";

  return [
    {
      key: "theyHelp",
      en: "THEY CAN HELP YOU",
      ko: "그들이 당신을 도울 수 있다",
      line: theyHelpLine,
    },
    {
      key: "youHelp",
      en: "YOU CAN HELP THEM",
      ko: "당신이 그들을 도울 수 있다",
      line: youHelpLine,
    },
    {
      key: "shared",
      en: "SHARED VISION",
      ko: "공통의 비전",
      line: sharedLine || "No shared imagination yet. / 아직 겹치는 상상이 없다.",
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
