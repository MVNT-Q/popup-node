"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConstellationSky, type SkyPoint } from "@/components/ConstellationSky";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { ImagineTicker } from "@/components/ImagineTicker";
import { midStrongHits, type HitLite } from "@/lib/relation";
import type { Slot } from "@/lib/types";

type Star = {
  id: string;
  code: number;
  name: string;
  band: "dim" | "weak" | "mid" | "strong";
  slots: Slot[];
  hits: HitLite[];
};

type Me = { id: string; code: number; name: string; slots: Slot[] };

const Q = [
  { key: "SEEK", index: 0 },
  { key: "OFFER", index: 1 },
  { key: "IMAGINE", index: 2 },
] as const;

export default function MyNodePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [imagines, setImagines] = useState<string[]>([]);
  const [on, setOn] = useState<number[]>([0, 1, 2]);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/sky?view=my", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      const data = (await response.json()) as {
        error?: string;
        me?: Me;
        stars?: Star[];
        imagines?: string[];
      };
      if (!response.ok) throw new Error(data.error || "내 노드를 열지 못했습니다.");
      if (stop) return;
      setMe(data.me ?? null);
      setStars(data.stars ?? []);
      setImagines(data.imagines ?? []);
      setError("");
    }
    load().catch((reason) => {
      if (!stop) setError(reason instanceof Error ? reason.message : "내 노드를 열지 못했습니다.");
    });
    return () => {
      stop = true;
    };
  }, [router]);

  // /my-node 하늘에는 내 별만. 타인·연결 선 없음.
  const skyStars: SkyPoint[] = useMemo(() => {
    if (!me) return [];
    return [
      {
        id: me.id,
        code: me.code,
        name: me.name,
        x: 500,
        y: 500,
        band: "self",
        selected: false,
      },
    ];
  }, [me]);

  const codeLabel = me ? `#${String(me.code).padStart(3, "0")} / ${me.name}` : "";
  const resonance = stars.filter((star) => midStrongHits(star.hits).length > 0).length;

  function toggle(index: number) {
    setOn((prev) => {
      if (prev.includes(index)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== index);
      }
      return [...prev, index].sort();
    });
  }

  return (
    <main className="cyp cyp-sky-page cyp-grove">
      <GroveBackdrop />
      <header className="cyp-sky-head">
        <div>
          <p className="fine">MY NODE / 나의 NODE</p>
          <h1 className="cyp-sky-title">{codeLabel || "…"}</h1>
          <p className="cyp-sky-meta">
            ACTIVE · {stars.length ? `${resonance} RESONANT` : "NO RESONANCE YET"}
          </p>
        </div>
        <div className="cyp-sky-head-right">
          <Link className="cyp-mini" href="/signals">
            MY SIGNALS
          </Link>
        </div>
      </header>

      <div className="cyp-qrow" role="group" aria-label="Questions">
        {Q.map((item) => (
          <button
            key={item.key}
            type="button"
            className={on.includes(item.index) ? "cyp-q on" : "cyp-q"}
            aria-pressed={on.includes(item.index)}
            onClick={() => toggle(item.index)}
          >
            {item.key}
          </button>
        ))}
      </div>

      {error ? <p className="cyp-error">{error}</p> : null}

      {!me ? (
        <p className="hint center">불러오는 중</p>
      ) : (
        <ConstellationSky stars={skyStars} edges={[]} focusId={null} onPick={() => {}} />
      )}

      <ImagineTicker lines={imagines} />

      <div className="cyp-mode-bar" role="tablist" aria-label="Grove mode">
        <button
          type="button"
          role="tab"
          aria-selected={false}
          onClick={() => router.push("/grove")}
        >
          <i aria-hidden />
          GROVE
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          onClick={() => router.push("/grove?mode=collective")}
        >
          <i aria-hidden />
          COLLECTIVE IMAGINATION
        </button>
      </div>
    </main>
  );
}
