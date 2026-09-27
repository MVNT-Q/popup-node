"use client";

import Link from "next/link";
import { useState } from "react";
import {
  quoteForLang,
  relationBlocks,
  sheetChrome,
  type HitLite,
  type SheetLang,
} from "@/lib/relation";
import type { Slot } from "@/lib/types";

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
  const blocks = relationBlocks(meSlots, theirSlots, hits);
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
            const quote = quoteForLang(block.quote, lang);
            const line = lang === "ko" ? block.ko : block.en;
            const hint = lang === "ko" ? block.hintKo : block.hintEn;
            return (
              <section key={block.key} className="cyp-sheet-row">
                <p className="cyp-sheet-row-label">{line}</p>
                <p className="cyp-sheet-hint">{hint}</p>
                {quote.note ? <p className="cyp-sheet-quote-note">{quote.note}</p> : null}
                {quote.text ? <p className="cyp-sheet-line">{quote.text}</p> : null}
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
