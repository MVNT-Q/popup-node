import { SLOT_COUNTERPART, SLOT_TARGETS } from "./prompts";
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

export function midStrongHits(hits: HitLite[]) {
  return hits.filter((hit) => hit.band === "mid" || hit.band === "strong");
}

/**
 * 중·강 히트만 카드 문장에 쓴다 (줄·토글과 같은 mid 막대).
 * 짝 칸(SLOT_TARGETS) 히트만 인정. 인용 문장은 SLOT_COUNTERPART에서 읽는다.
 */
function solidSlotHit(hits: HitLite[], questionIndex: number): HitLite | undefined {
  const solid = midStrongHits(hits).filter((item) => item.questionIndex === questionIndex);
  if (!solid.length) return undefined;
  const allowed = SLOT_TARGETS[questionIndex] ?? [];
  // 짝 칸 히트 우선. 예전에 theirIndex가 어긋난 mid 히트만 있으면 그래도 문장은 살린다.
  const matched = allowed.length
    ? solid.find((item) => allowed.includes(item.theirIndex))
    : solid[0];
  return matched ?? solid[0];
}

/** mid를 넘긴 슬롯의 짝 문장만 — IMAGINE이 SEEK/OFFER로 새지 않게 */
function counterpartQuote(theirSlots: Slot[], hit: HitLite, questionIndex: number): string {
  const idx = SLOT_COUNTERPART[questionIndex];
  if (idx == null) return "";
  // 짝 칸 원문. hit.answer는 같은 칸일 때만 보조.
  return tidy(
    slotAnswer(theirSlots, idx) || (hit.theirIndex === idx ? hit.answer || "" : "") || "",
  );
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

// 퍼센트 없이 세 줄. 라벨은 손글 en/ko. 인용은 중·강일 때 그 슬롯 짝 문장만.
export function relationBlocks(_meSlots: Slot[], theirSlots: Slot[], hits: HitLite[]): RelationBlock[] {
  const seek = solidSlotHit(hits, 0);
  const offer = solidSlotHit(hits, 1);
  const imagine = solidSlotHit(hits, 2);

  // SEEK 행: 상대 OFFER만. IMAGINE 문장 금지. mid 미만이면 빈 줄.
  const theyHelpQuote = seek ? counterpartQuote(theirSlots, seek, 0) : "";
  // OFFER 행: 상대 SEEK만.
  const youHelpQuote = offer ? counterpartQuote(theirSlots, offer, 1) : "";
  // IMAGINE 행: 미래상 칸만. SEEK/OFFER 끌어오지 않음.
  const imagineQuote = imagine ? counterpartQuote(theirSlots, imagine, 2) : "";

  return [
    {
      key: "theyHelp",
      en: theyHelpQuote ? "They can give what you are looking for" : "No overlap on what you seek",
      ko: theyHelpQuote ? "내가 찾는 걸 이 사람이 갖고 있어" : "내가 찾는 걸과는 아직 안 겹쳐",
      hintEn: "their offer · your seek",
      hintKo: "상대 제안 · 내가 찾는 것",
      quote: theyHelpQuote,
    },
    {
      key: "youHelp",
      en: youHelpQuote ? "You can give what they are looking for" : "No overlap on what you offer",
      ko: youHelpQuote ? "이 사람이 찾는 걸 내가 줄 수 있어" : "내가 줄 수 있는 걸과는 아직 안 겹쳐",
      hintEn: "your offer · their seek",
      hintKo: "내가 줄 수 있는 것 · 상대가 찾는 것",
      quote: youHelpQuote,
    },
    {
      key: "shared",
      en: imagineQuote ? "Your imaginations meet" : "Imaginations do not meet yet",
      ko: imagineQuote ? "상상하는 게 겹쳐" : "상상은 아직 안 겹쳐",
      hintEn: "shared imagining",
      hintKo: "겹치는 상상",
      quote: imagineQuote,
    },
  ];
}

export function hasAnyHit(hits: HitLite[]) {
  return hits.length > 0;
}

export function brightestBand(hits: HitLite[]): Band | "dim" {
  if (hits.some((hit) => hit.band === "strong")) return "strong";
  if (hits.some((hit) => hit.band === "mid")) return "mid";
  if (hits.some((hit) => hit.band === "weak")) return "weak";
  return "dim";
}
