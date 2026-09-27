"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GroveBackdrop } from "@/components/GroveBackdrop";
import { PROMPTS } from "@/lib/prompts";
import type { Slot } from "@/lib/types";

type Me = { id: string; code: number; name: string; slots: Slot[] };

export default function SignalsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        const data = (await response.json()) as { me?: Me | null; error?: string };
        if (!response.ok) throw new Error(data.error || "시그널을 열지 못했습니다.");
        if (stop) return;
        if (!data.me) {
          router.replace("/");
          return;
        }
        setMe(data.me);
      })
      .catch((reason) => {
        if (!stop) setError(reason instanceof Error ? reason.message : "시그널을 열지 못했습니다.");
      });
    return () => {
      stop = true;
    };
  }, [router]);

  const seek = me?.slots[0];
  const offer = me?.slots[1];
  const imagine = me?.slots[2];

  return (
    <main className="cyp cyp-signals">
      <GroveBackdrop />
      <p className="fine">MY SIGNALS / 내 시그널</p>
      <h1 className="display form-title">SENT TO THE GROVE</h1>
      <p className="ko center">그로브에 보낸 문장. 고치기 없음.</p>
      {error ? <p className="cyp-error">{error}</p> : null}

      <section className="block">
        <h2>
          <b>01</b>
          {PROMPTS[0].title}
        </h2>
        <p className="ko">{PROMPTS[0].ko}</p>
        <p className="cyp-read">{seek?.answer || "…"}</p>
      </section>

      <section className="block">
        <h2>
          <b>02</b>
          {PROMPTS[1].title}
        </h2>
        <p className="ko">{PROMPTS[1].ko}</p>
        {offer?.tags?.length ? (
          <div className="chips readonly">
            {offer.tags.map((tag) => (
              <span className="chip on" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="cyp-read">{offer?.answer || "…"}</p>
      </section>

      <section className="block">
        <h2>
          <b>03</b>
          {PROMPTS[2].title}
        </h2>
        <p className="ko">{PROMPTS[2].ko}</p>
        <p className="cyp-read">{imagine?.answer || "…"}</p>
      </section>

      <Link className="cyp-btn" href="/my-node">
        <span>
          BACK TO MY NODE <i aria-hidden>→</i>
        </span>
        <small>내 노드로</small>
      </Link>
    </main>
  );
}
