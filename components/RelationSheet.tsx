"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
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
    setText(quote);
    if (!quote.trim()) return;
    void translateQuote(quote, lang).then((next) => {
      if (!stop) setText(next);
    });
    return () => {
      stop = true;
    };
  }, [quote, lang]);

  if (!text) return null;
  return <p className="cyp-sheet-line">{text}</p>;
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
