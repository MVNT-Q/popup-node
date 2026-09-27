"use client";

import Link from "next/link";
import { relationBlocks, type HitLite } from "@/lib/relation";
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
  const blocks = relationBlocks(meSlots, theirSlots, hits);
  const label = `#${String(code).padStart(3, "0")} ${name}`;

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
          {blocks.map((block) => (
            <section key={block.key}>
              <p className="fine">{block.en}</p>
              <p className="ko">{block.ko}</p>
              <p className="cyp-sheet-line">{block.line}</p>
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
