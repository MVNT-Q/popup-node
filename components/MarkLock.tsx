/** 목업 육각(생성/본 화면 기하학) — 가짜 번호 없는 잠상 SVG */
export function MarkLock({ variant = "landing" }: { variant?: "landing" | "born" }) {
  const size = variant === "born" ? 120 : 100;
  return (
    <div className={`mark-lock ${variant}`} aria-hidden>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {/* 외곽 육각 */}
        <polygon
          points="60,6 108,34 108,86 60,114 12,86 12,34"
          fill="none"
          stroke="#1cff8a"
          strokeWidth="1.1"
          opacity="0.95"
        />
        {/* 꼭짓점 작은 육각 */}
        {[
          [60, 18],
          [92, 36],
          [92, 84],
          [60, 102],
          [28, 84],
          [28, 36],
        ].map(([cx, cy], i) => (
          <polygon
            key={i}
            points={`${cx},${cy - 7} ${cx + 6},${cy - 3.5} ${cx + 6},${cy + 3.5} ${cx},${cy + 7} ${cx - 6},${cy + 3.5} ${cx - 6},${cy - 3.5}`}
            fill="none"
            stroke="#7dffb4"
            strokeWidth="0.7"
            opacity="0.75"
          />
        ))}
        {/* 내부 원 그물 */}
        <circle cx="60" cy="60" r="28" fill="none" stroke="#1cff8a" strokeWidth="0.7" opacity="0.55" />
        <circle cx="60" cy="60" r="16" fill="none" stroke="#b8ffd8" strokeWidth="0.6" opacity="0.45" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = 60 + Math.cos(rad) * 28;
          const y = 60 + Math.sin(rad) * 28;
          return <line key={deg} x1="60" y1="60" x2={x} y2={y} stroke="#1cff8a" strokeWidth="0.55" opacity="0.5" />;
        })}
        {/* 안쪽 육각 */}
        <polygon
          points="60,34 82,47 82,73 60,86 38,73 38,47"
          fill="none"
          stroke="#d8ffe8"
          strokeWidth="0.9"
          opacity="0.85"
        />
        <circle cx="60" cy="60" r="3.2" fill="#1cff8a" />
        {[
          [60, 34],
          [82, 47],
          [82, 73],
          [60, 86],
          [38, 73],
          [38, 47],
        ].map(([x, y], i) => (
          <circle key={`n${i}`} cx={x} cy={y} r="1.6" fill="#b8ffd8" />
        ))}
      </svg>
    </div>
  );
}
