/** CYP3 육각 마크 — public/hex-mark.png (검정 투명 처리, SVG 재그리기 없음) */
export function MarkLock({ variant = "landing" }: { variant?: "landing" | "born" }) {
  return (
    <div className={`mark-lock ${variant}`} aria-hidden>
      <img
        src="/hex-mark.png"
        alt=""
        width={120}
        height={120}
        draggable={false}
      />
    </div>
  );
}
