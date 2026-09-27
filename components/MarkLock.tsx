/** CYP3 육각 마크 — SVG 기하 (글자·JPG 없음) */
export function MarkLock({ variant = "landing" }: { variant?: "landing" | "born" }) {
  return (
    <div className={`mark-lock ${variant}`} aria-hidden>
      <svg viewBox="0 0 200 200" width="120" height="120" fill="none">
        <defs>
          <filter id="hexGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g stroke="#1cff8a" strokeLinecap="round" strokeLinejoin="round" filter="url(#hexGlow)">
          {/* 외곽 육각 */}
          <polygon points="100,18 171,59 171,141 100,182 29,141 29,59" strokeWidth="1.35" />
          {/* 안쪽 육각 */}
          <polygon points="100,48 145,74 145,126 100,152 55,126 55,74" strokeWidth="0.9" opacity="0.85" />
          {/* 중앙 링 */}
          <circle cx="100" cy="100" r="22" strokeWidth="1.1" />
          <circle cx="100" cy="100" r="10" strokeWidth="0.9" />
          <circle cx="100" cy="100" r="3.2" fill="#1cff8a" stroke="none" />
          {/* 로케트 살 — 중심→꼭짓점 */}
          <g strokeWidth="0.85" opacity="0.95">
            <line x1="100" y1="100" x2="100" y2="18" />
            <line x1="100" y1="100" x2="171" y2="59" />
            <line x1="100" y1="100" x2="171" y2="141" />
            <line x1="100" y1="100" x2="100" y2="182" />
            <line x1="100" y1="100" x2="29" y2="141" />
            <line x1="100" y1="100" x2="29" y2="59" />
          </g>
          {/* 꼭짓점끼리 대각 — 결정 격자 */}
          <g strokeWidth="0.55" opacity="0.55">
            <line x1="100" y1="18" x2="171" y2="141" />
            <line x1="100" y1="18" x2="29" y2="141" />
            <line x1="171" y1="59" x2="100" y2="182" />
            <line x1="171" y1="59" x2="29" y2="141" />
            <line x1="171" y1="141" x2="29" y2="59" />
            <line x1="100" y1="182" x2="29" y2="59" />
          </g>
          {/* 중점 고리 연결 */}
          <polygon
            points="100,59 145.5,79.5 145.5,120.5 100,141 54.5,120.5 54.5,79.5"
            strokeWidth="0.5"
            opacity="0.4"
          />
          {/* 꼭짓점 작은 육각 */}
          <g strokeWidth="1">
            <polygon points="100,10 108,14.5 108,23.5 100,28 92,23.5 92,14.5" />
            <polygon points="171,51 179,55.5 179,64.5 171,69 163,64.5 163,55.5" />
            <polygon points="171,133 179,137.5 179,146.5 171,151 163,146.5 163,137.5" />
            <polygon points="100,172 108,176.5 108,185.5 100,190 92,185.5 92,176.5" />
            <polygon points="29,133 37,137.5 37,146.5 29,151 21,146.5 21,137.5" />
            <polygon points="29,51 37,55.5 37,64.5 29,69 21,64.5 21,55.5" />
          </g>
          {/* 교점 작은 점 */}
          <g fill="#1cff8a" stroke="none">
            <circle cx="100" cy="48" r="2" />
            <circle cx="145" cy="74" r="2" />
            <circle cx="145" cy="126" r="2" />
            <circle cx="100" cy="152" r="2" />
            <circle cx="55" cy="126" r="2" />
            <circle cx="55" cy="74" r="2" />
          </g>
        </g>
      </svg>
    </div>
  );
}
