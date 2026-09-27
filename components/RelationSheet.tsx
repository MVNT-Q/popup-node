"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { themeHits } from "@/lib/match";
import {
  answerBlocks,
  midStrongHits,
  relationBlocks,
  sheetChrome,
  type HitLite,
  type SheetLang,
} from "@/lib/relation";
import { translateQuote } from "@/lib/translate";
import type { Slot } from "@/lib/types";

/** 별을 연 그 손가락의 합성 click이 스크림을 바로 닫지 않게 */
const SCRIM_ARM_MS = 700;

function TranslatedQuote({ quote, lang }: { quote: string; lang: SheetLang }) {
  const [text, setText] = useState(quote);

  useEffect(() => {
    let stop = false;
    // 번역 전에 원문을 바로 보여 mid 문장이 빈 칸으로 남지 않게
    setText(quote);
    if (!quote.trim()) return;
    void translateQuote(quote, lang).then((next) => {
      if (!stop) setText(next.trim() || quote);
    });
    return () => {
      stop = true;
    };
  }, [quote, lang]);

  const shown = text.trim() || quote.trim();
  if (!shown) return null;
  return <p className="cyp-sheet-line">{shown}</p>;
}

/** API hits가 비었거나 mid가 빠졌을 때 슬롯 문장으로 다시 채움 (같은 mid 막대) */
function hitsForCard(meSlots: Slot[], theirSlots: Slot[], hits: HitLite[]): HitLite[] {
  if (midStrongHits(hits).length > 0) return hits;
  const mine = meSlots.map((slot) => slot.answer ?? "");
  const theirs = theirSlots.map((slot) => slot.answer ?? "");
  if (!mine.some((text) => text.trim().length >= 2)) return hits;
  if (!theirs.some((text) => text.trim().length >= 2)) return hits;
  const ranked = themeHits(mine, theirs, [0, 1, 2]);
  return ranked.hits.map((hit) => ({
    questionIndex: hit.questionIndex,
    theirIndex: hit.theirIndex,
    band: hit.band,
    score: hit.score,
    answer: theirs[hit.theirIndex] ?? "",
  }));
}

export function RelationSheet({
  meSlots,
  theirSlots,
  code,
  name,
  id,
  hits,
  onClose,
  variant = "relation",
}: {
  meSlots: Slot[];
  theirSlots: Slot[];
  code: number;
  name: string;
  id: string;
  hits: HitLite[];
  onClose: () => void;
  /** relation = 내 노드 관계 카드. answers = 그로브 SEEK/OFFER/IMAGINE 원문 */
  variant?: "relation" | "answers";
}) {
  const [lang, setLang] = useState<SheetLang>("en");
  const chrome = sheetChrome(lang, variant);
  const effectiveHits = useMemo(
    () => hitsForCard(meSlots, theirSlots, hits),
    [meSlots, theirSlots, hits],
  );
  const relationRows = useMemo(
    () => relationBlocks(meSlots, theirSlots, effectiveHits),
    [meSlots, theirSlots, effectiveHits],
  );
  const answerRows = useMemo(() => answerBlocks(theirSlots), [theirSlots]);
  const label = `#${String(code).padStart(3, "0")} ${name}`;
  // 카드가 뜬 직후 같은 좌표로 오는 호환 click을 흡수 — 포커스·카드가 바로 닫히던 원인
  const scrimArmedAt = useRef(0);
  useEffect(() => {
    scrimArmedAt.current = performance.now() + SCRIM_ARM_MS;
  }, [id]);

  function closeFromScrim(event: { preventDefault: () => void; stopPropagation: () => void }) {
    // 별을 연 그 손가락의 호환 click이 스크림에 떨어져 바로 닫히던 경로
    if (performance.now() < scrimArmedAt.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClose();
  }

  return (
    <>
      <button
        className="cyp-sheet-scrim"
        type="button"
        aria-label={chrome.close}
        onClick={closeFromScrim}
        onPointerDown={(event) => {
          if (performance.now() < scrimArmedAt.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerUp={(event) => {
          if (performance.now() < scrimArmedAt.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      />
      <div className="cyp-sheet cyp-sheet-float" role="dialog" aria-label={label} lang={lang}>
        <button className="cyp-sheet-close" type="button" onClick={onClose} aria-label={chrome.close}>
          ×
        </button>
        <div className="cyp-sheet-head">
          <div>
            <p className="cyp-sheet-kicker">{chrome.kicker}</p>
            <h2 className="cyp-sheet-title">{label}</h2>
          </div>
          <button
            type="button"
            className="cyp-sheet-lang"
            aria-label={chrome.switchTo}
            aria-pressed={true}
            onClick={() => setLang((prev) => (prev === "en" ? "ko" : "en"))}
          >
            <span aria-hidden>{lang}</span>
          </button>
        </div>
        <div className="cyp-sheet-blocks" key={`${variant}-${lang}`}>
          {variant === "answers"
            ? answerRows.map((block) => {
                const line = lang === "ko" ? block.ko : block.en;
                // 빈 칸은 라벨만 조용히 — 관계 문구·힌트 금지
                return (
                  <section key={block.key} className="cyp-sheet-row">
                    <p className="cyp-sheet-row-label">{line}</p>
                    {block.quote ? <TranslatedQuote quote={block.quote} lang={lang} /> : null}
                  </section>
                );
              })
            : relationRows.map((block) => {
                const line = lang === "ko" ? block.ko : block.en;
                const hint = lang === "ko" ? block.hintKo : block.hintEn;
                return (
                  <section key={block.key} className="cyp-sheet-row">
                    <p className="cyp-sheet-row-label">{line}</p>
                    <p className="cyp-sheet-hint">{hint}</p>
                    <TranslatedQuote quote={block.quote} lang={lang} />
                  </section>
                );
              })}
        </div>
        <Link className="cyp-btn" href={`/chat/${id}`}>
          <span>
            {chrome.channel} <i aria-hidden>→</i>
          </span>
        </Link>
      </div>
    </>
  );
}
