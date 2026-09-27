import { SLOT_TARGETS } from "./prompts";
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
  /** 관계 한 줄 — 고정 카피(번역 API 금지). 토글 시 en/ko가 바뀜 */
  en: string;
  ko: string;
  /** 안내 한 줄 — 토글이 죽은 것처럼 보이지 않게 */
  hintEn: string;
  hintKo: string;
  /** 노드가 적은 SEEK/OFFER/IMAGINE 원문 — 시트에서 목표 언어로 번역 */
  quote: string;
};

export type SheetLang = "en" | "ko";

function tidy(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function slotAnswer(slots: Slot[], index: number) {
  return slots[index]?.answer?.trim() ?? "";
}

/** hit.theirIndex가 그 질문의 SLOT_TARGETS 안일 때만 유효 */
function slotHit(hits: HitLite[], questionIndex: number): HitLite | undefined {
  const hit = hits.find((item) => item.questionIndex === questionIndex);
  if (!hit) return undefined;
  const allowed = SLOT_TARGETS[questionIndex] ?? [];
  if (!allowed.includes(hit.theirIndex)) return undefined;
  return hit;
}

/** 원문 언어 추정 — 이미 목표 언어면 번역 호출 생략 */
export function guessTextLang(text: string): SheetLang | "mixed" | "empty" {
  const t = text.trim();
  if (!t) return "empty";
  const hangul = (t.match(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  if (hangul === 0 && latin === 0) return "empty";
  if (hangul > 0 && latin > 0) return "mixed";
  return hangul > 0 ? "ko" : "en";
}

/** 카드 크롬 — en/ko 토글이 여기만 보면 됨 */
export function sheetChrome(lang: SheetLang) {
  if (lang === "ko") {
    return {
      kicker: "연결된 노드",
      close: "닫기",
      channel: "프라이빗 채널 열기",
      switchTo: "Show in English" as const,
    };
  }
  return {
    kicker: "CONNECTED NODE",
    close: "Close",
    channel: "OPEN PRIVATE CHANNEL",
    switchTo: "한국어로 보기" as const,
  };
}

// 퍼센트 없이 세 줄. 라벨은 손글 en/ko. 인용은 그 슬롯 짝만.
export function relationBlocks(_meSlots: Slot[], theirSlots: Slot[], hits: HitLite[]): RelationBlock[] {
  const seek = slotHit(hits, 0);
  const offer = slotHit(hits, 1);
  const imagine = slotHit(hits, 2);

  // SEEK 행: 상대 OFFER(또는 허용된 SEEK). IMAGINE 금지. 겹침 없으면 빈 줄.
  const theyHelpQuote = seek
    ? tidy(slotAnswer(theirSlots, seek.theirIndex) || seek.answer || "")
    : "";

  // OFFER 행: 상대 SEEK(또는 허용된 OFFER). IMAGINE 금지.
  const youHelpQuote = offer
    ? tidy(slotAnswer(theirSlots, offer.theirIndex) || offer.answer || "")
    : "";

  // IMAGINE 행: 미래상 칸(2)만. SEEK/OFFER 문장 끌어오지 않음.
  const imagineQuote = imagine
    ? tidy(slotAnswer(theirSlots, 2) || (imagine.theirIndex === 2 ? imagine.answer || "" : ""))
    : "";

  return [
    {
      key: "theyHelp",
      en: seek && theyHelpQuote ? "They can give what you are looking for" : "No overlap on what you seek",
      ko: seek && theyHelpQuote ? "내가 찾는 걸 이 사람이 갖고 있어" : "내가 찾는 걸과는 아직 안 겹쳐",
      hintEn: "their offer · your seek",
      hintKo: "상대 제안 · 내가 찾는 것",
      quote: theyHelpQuote,
    },
    {
      key: "youHelp",
      en: offer && youHelpQuote ? "You can give what they are looking for" : "No overlap on what you offer",
      ko: offer && youHelpQuote ? "이 사람이 찾는 걸 내가 줄 수 있어" : "내가 줄 수 있는 걸과는 아직 안 겹쳐",
      hintEn: "your offer · their seek",
      hintKo: "내가 줄 수 있는 것 · 상대가 찾는 것",
      quote: youHelpQuote,
    },
    {
      key: "shared",
      en: imagine && imagineQuote ? "Your imaginations meet" : "Imaginations do not meet yet",
      ko: imagine && imagineQuote ? "상상하는 게 겹쳐" : "상상은 아직 안 겹쳐",
      hintEn: "shared imagining",
      hintKo: "겹치는 상상",
      quote: imagineQuote,
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
