"use client";

import Link from "next/link";
import { useState } from "react";
import { quoteForLang, relationBlocks, type HitLite, type SheetLang } from "@/lib/relation";
import type { Slot } from "@/lib/types";

export function RelationSheet({
  meSlots,
  theirSlots,
  code,
  name,
  id,
  hits,
  onClose,
  /** 그로브/쇼에서 내 별을 열 때만. /my-node 안에서는 넣지 않음 */
  showGoMyNode = false,
}: {
  meSlots: Slot[];
  theirSlots: Slot[];
  code: number;
  name: string;
  id: string;
  hits: HitLite[];
  onClose: () => void;
  showGoMyNode?: boolean;
}) {
  const blocks = relationBlocks(meSlots, theirSlots, hits);
  const label = `#${String(code).padStart(3, "0")} ${name}`;
  const [lang, setLang] = useState<SheetLang>("en");

  return (
    <>
      <button className="cyp-sheet-scrim" type="button" aria-label="Close" onClick={onClose} />
      <div className="cyp-sheet cyp-sheet-float" role="dialog" aria-label={label}>
        <button className="cyp-sheet-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="cyp-sheet-head">
          <div>
            <p className="cyp-sheet-kicker">
              {showGoMyNode
                ? lang === "ko"
                  ? "나의 노드"
                  : "MY NODE"
                : lang === "ko"
                  ? "연결된 노드"
                  : "CONNECTED NODE"}
            </p>
            <h2 className="cyp-sheet-title">{label}</h2>
          </div>
          <button
            type="button"
            className="cyp-sheet-lang"
            aria-label={lang === "en" ? "한국어로 보기" : "Show in English"}
            aria-pressed={true}
            onClick={() => setLang((prev) => (prev === "en" ? "ko" : "en"))}
          >
            <span aria-hidden>{lang}</span>
          </button>
        </div>
        <div className="cyp-sheet-blocks">
          {blocks.map((block) => {
            const quote = quoteForLang(block.quote, lang);
            return (
              <section key={block.key} className="cyp-sheet-row">
                <p className="cyp-sheet-row-label">{lang === "ko" ? block.ko : block.en}</p>
                <p className="cyp-sheet-hint">{lang === "ko" ? block.hintKo : block.hintEn}</p>
                {quote ? <p className="cyp-sheet-line">{quote}</p> : null}
              </section>
            );
          })}
        </div>
        {showGoMyNode ? (
          <Link className="cyp-btn" href="/my-node">
            {lang === "ko" ? (
              <span>
                내 노드로 가기 <i aria-hidden>→</i>
              </span>
            ) : (
              <span>
                GO TO MY NODE <i aria-hidden>→</i>
              </span>
            )}
          </Link>
        ) : (
          <Link className="cyp-btn" href={`/chat/${id}`}>
            {lang === "ko" ? (
              <span>
                프라이빗 채널 열기 <i aria-hidden>→</i>
              </span>
            ) : (
              <span>
                OPEN PRIVATE CHANNEL <i aria-hidden>→</i>
              </span>
            )}
          </Link>
        )}
      </div>
    </>
  );
}
