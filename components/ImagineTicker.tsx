"use client";

export function ImagineTicker({ lines }: { lines: string[] }) {
  // 저장된 IMAGINE 문장 두 줄. 왼쪽→오른쪽, 천천히, 크게.
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (line.length < 2 || seen.has(line)) continue;
    seen.add(line);
    cleaned.push(line);
  }
  const rowA = cleaned.length ? cleaned : ["Waiting for imaginings…"];
  const rowB = cleaned.length > 1 ? [...cleaned].reverse() : rowA;

  function track(items: string[], key: string) {
    const doubled = [...items, ...items];
    return (
      <div className="cyp-ticker-row" key={key}>
        <div className="cyp-ticker-track">
          {doubled.map((line, index) => (
            <span key={`${key}-${index}`}>· {line}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cyp-ticker" aria-hidden>
      {track(rowA, "a")}
      {track(rowB, "b")}
    </div>
  );
}
