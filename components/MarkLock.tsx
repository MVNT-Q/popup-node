/** CYP3 육각 마크 — public/hex-mark.jpg (사용자 제공, SVG 대체 없음) */
export function MarkLock({ variant = "landing" }: { variant?: "landing" | "born" }) {
  return (
    <div className={`mark-lock ${variant}`} aria-hidden>
      <img
        src="/hex-mark.jpg"
        alt=""
        width={120}
        height={120}
        draggable={false}
      />
    </div>
  );
}
