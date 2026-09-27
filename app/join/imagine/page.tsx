"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExperimentKicker, GroveBackdrop, StepMark } from "@/components/GroveBackdrop";
import { clearDraft, readDraft, type NodeDraft } from "@/lib/draft";
import { IMAGINE_CARDS } from "@/lib/prompts";

export default function ImaginePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<NodeDraft | null>(null);
  const [words, setWords] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const saved = readDraft();
    if (!saved) {
      router.replace("/join");
      return;
    }
    setDraft(saved);
  }, [router]);

  async function complete() {
    if (!draft) return;
    if (words.trim().length < 2) {
      setError("상상하는 미래를 두 글자 이상 적어 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.callsign,
          slots: [{ answer: draft.seek }, { answer: draft.offer, tags: draft.tags }, { words, selected: [] }],
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "저장 실패");
      clearDraft();
      router.push("/born");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "저장 실패");
      setPending(false);
    }
  }

  return (
    <main className="cyp">
      <GroveBackdrop />
      <ExperimentKicker />
      <h1 className="display form-title">I IMAGINE</h1>
      <p className="imagine-en">The future I want to live in.</p>
      <p className="ko center">당신이 상상하는 미래</p>

      <div className="copy tight">
        <p>What kind of future would you like to see, build, or be part of?</p>
        <p className="ko">당신이 보고, 만들고, 함께 살아가고 싶은 미래는 어떤 모습인가요?</p>
        <p>
          Describe a world, community, or way of living. Atmosphere, values, relationships, technology, nature, everyday
          life. What could be different, newly possible, or newly needed.
        </p>
        <p className="ko">
          분위기, 가치, 관계, 기술, 자연 또는 일상을 떠올려보세요. 지금과 달라질 것, 새롭게 가능해질 것, 더 이상
          필요하지 않을 것도 상상해보세요.
        </p>
      </div>

      <textarea
        className="cyp-input"
        rows={6}
        maxLength={500}
        value={words}
        placeholder="I imagine a future where..."
        onChange={(event) => setWords(event.target.value)}
      />
      <p className="fine">
        It can be a vision, a feeling, a place, a scene, a story, or even something that seems impossible today.
      </p>
      <p className="ko">비전, 감정, 장소, 장면, 이야기. 또는 지금은 불가능해 보이는 상상도 좋습니다.</p>

      <button className="ghost-line" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "HIDE EXAMPLES ↑" : "SEE EXAMPLES ↓"}
      </button>
      {open ? (
        <div className="imagine-cards">
          {IMAGINE_CARDS.map((card) => (
            <article key={card.scene} className="imagine-card text-only">
              <p>{card.en}</p>
              <p className="ko">{card.ko}</p>
            </article>
          ))}
        </div>
      ) : null}

      {error ? <p className="cyp-error">{error}</p> : null}
      <button className="cyp-btn" type="button" disabled={pending || !draft} onClick={() => void complete()}>
        <span>
          {pending ? "…" : "COMPLETE"} <i aria-hidden>→</i>
        </span>
        <small>NODE 생성하기</small>
      </button>
      <StepMark step={2} />
    </main>
  );
}
