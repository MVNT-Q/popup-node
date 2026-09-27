"use client";

import Link from "next/link";
import { useState } from "react";
import { relationBlocks, type HitLite } from "@/lib/relation";
import type { Slot } from "@/lib/types";

type Lang = "en" | "ko";

function pickLine(line: string, lang: Lang) {
  const parts = line
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return lang === "ko" ? parts[parts.length - 1]! : parts[0]!;
  }
  return line;
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
  const blocks = relationBlocks(meSlots, theirSlots, hits);
  const label = `#${String(code).padStart(3, "0")} ${name}`;
  const [langs, setLangs] = useState<Partial<Record<string, Lang>>>({});

  return (
    <>
      <button className="cyp-sheet-scrim" type="button" aria-label="Close" onClick={onClose} />
      <div className="cyp-sheet" role="dialog" aria-label={label}>
        <button className="cyp-sheet-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="cyp-sheet-kicker">CONNECTED NODE</p>
        <h2 className="cyp-sheet-title">{label}</h2>
        <div className="cyp-sheet-blocks">
          {blocks.map((block) => {
            const lang = langs[block.key] ?? "en";
            return (
              <section key={block.key} className="cyp-sheet-row">
                <div className="cyp-sheet-row-head">
                  <p className="cyp-sheet-row-label">{lang === "ko" ? block.ko : block.en}</p>
                  <button
                    type="button"
                    className="cyp-sheet-lang"
                    aria-label={lang === "en" ? "한국어로 보기" : "Show in English"}
                    onClick={() =>
                      setLangs((prev) => ({
                        ...prev,
                        [block.key]: lang === "en" ? "ko" : "en",
                      }))
                    }
                  >
                    <span aria-hidden>{lang === "en" ? "文" : "A"}</span>
                  </button>
                </div>
                <p className="cyp-sheet-line">{pickLine(block.line, lang)}</p>
              </section>
            );
          })}
        </div>
        <Link className="cyp-btn" href={`/chat/${id}`}>
          <span>
            OPEN PRIVATE CHANNEL <i aria-hidden>→</i>
          </span>
          <small>프라이빗 채널 열기</small>
        </Link>
      </div>
    </>
  );
}
