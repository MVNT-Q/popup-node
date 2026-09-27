"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { themeHits } from "@/lib/match";
import {
  midStrongHits,
  relationBlocks,
  sheetChrome,
  type HitLite,
  type SheetLang,
} from "@/lib/relation";
import { translateQuote } from "@/lib/translate";
import type { Slot } from "@/lib/types";

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
}: {
  meSlots: Slot[];
  theirSlots: Slot[];
  code: number;
  name: string;
  id: string;
  hits: HitLite[];
  onClose: () => void;
}) {
  const [lang, setLang] = useState<SheetLang>("en");
  const chrome = sheetChrome(lang);
  const effectiveHits = useMemo(
    () => hitsForCard(meSlots, theirSlots, hits),
    [meSlots, theirSlots, hits],
  );
  const blocks = relationBlocks(meSlots, theirSlots, effectiveHits);
  const label = `#${String(code).padStart(3, "0")} ${name}`;

  return (
    <>
      <button className="cyp-sheet-scrim" type="button" aria-label={chrome.close} onClick={onClose} />
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
        <div className="cyp-sheet-blocks" key={lang}>
          {blocks.map((block) => {
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
