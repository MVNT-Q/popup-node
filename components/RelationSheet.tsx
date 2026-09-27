"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { relationBlocks, type HitLite } from "@/lib/relation";
import type { Slot } from "@/lib/types";

type Lang = "en" | "ko";

export type SheetAnchor = { x: number; y: number };

export function RelationSheet({
  meSlots,
  theirSlots,
  code,
  name,
  id,
  hits,
  anchor,
  onClose,
}: {
  meSlots: Slot[];
  theirSlots: Slot[];
  code: number;
  name: string;
  id: string;
  hits: HitLite[];
  /** 누른 별의 화면 좌표(client). 없으면 화면 중앙 근처 */
  anchor?: SheetAnchor | null;
  onClose: () => void;
}) {
  const blocks = relationBlocks(meSlots, theirSlots, hits);
  const label = `#${String(code).padStart(3, "0")} ${name}`;
  const [lang, setLang] = useState<Lang>("en");
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; side: "left" | "right" }>({
    left: 12,
    top: 80,
    side: "right",
  });

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ax = anchor?.x ?? window.innerWidth / 2;
    const ay = anchor?.y ?? window.innerHeight * 0.4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const host = card.closest(".cyp-grove") ?? document.querySelector(".cyp-grove");
    const modeBar = host
      ? Number.parseFloat(getComputedStyle(host).getPropertyValue("--cyp-mode-bar-h"))
      : NaN;
    const bottomReserve = (Number.isFinite(modeBar) && modeBar > 0 ? modeBar : 16) + 8;
    const pad = 10;
    const gap = 14;
    const cardW = card.offsetWidth || Math.min(268, vw - pad * 2);
    const cardH = card.offsetHeight || 220;
    const side: "left" | "right" = ax < vw / 2 ? "right" : "left";
    let left = side === "right" ? ax + gap : ax - gap - cardW;
    left = Math.max(pad, Math.min(left, vw - cardW - pad));
    let top = ay - cardH * 0.35;
    top = Math.max(pad, Math.min(top, vh - bottomReserve - cardH - pad));
    setPos({ left, top, side });
  }, [anchor, lang, blocks.length]);

  return (
    <>
      <button className="cyp-sheet-scrim" type="button" aria-label="Close" onClick={onClose} />
      <div
        ref={cardRef}
        className={`cyp-sheet cyp-sheet-float side-${pos.side}`}
        role="dialog"
        aria-label={label}
        style={{ left: pos.left, top: pos.top }}
      >
        <button className="cyp-sheet-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="cyp-sheet-head">
          <div>
            <p className="cyp-sheet-kicker">{lang === "ko" ? "연결된 노드" : "CONNECTED NODE"}</p>
            <h2 className="cyp-sheet-title">{label}</h2>
          </div>
          <button
            type="button"
            className="cyp-sheet-lang"
            aria-label={lang === "en" ? "한국어로 보기" : "Show in English"}
            onClick={() => setLang((prev) => (prev === "en" ? "ko" : "en"))}
          >
            <span aria-hidden>{lang === "en" ? "ko" : "en"}</span>
          </button>
        </div>
        <div className="cyp-sheet-blocks">
          {blocks.map((block) => (
            <section key={block.key} className="cyp-sheet-row">
              <p className="cyp-sheet-row-label">{lang === "ko" ? block.ko : block.en}</p>
              <p className="cyp-sheet-hint">{lang === "ko" ? block.hintKo : block.hintEn}</p>
              {block.quote ? <p className="cyp-sheet-line">{block.quote}</p> : null}
            </section>
          ))}
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
