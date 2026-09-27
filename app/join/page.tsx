"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExperimentKicker, GroveBackdrop, StepMark } from "@/components/GroveBackdrop";
import { writeDraft } from "@/lib/draft";
import { OFFER_EXAMPLES, OFFER_TAGS, SEEK_EXAMPLES } from "@/lib/prompts";

export default function JoinPage() {
  const router = useRouter();
  const [callsign, setCallsign] = useState("");
  const [seek, setSeek] = useState("");
  const [offer, setOffer] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [open, setOpen] = useState<"seek" | "offer" | null>(null);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: { id: string } | null }) => setExists(Boolean(data.me)))
      .catch(() => undefined);
  }, []);

  function toggleTag(tag: string) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((item) => item !== tag);
      if (prev.length >= 4) return prev;
      return [...prev, tag];
    });
  }

  function next() {
    if (exists) return;
    if (callsign.trim().length < 2 || seek.trim().length < 2 || offer.trim().length < 2) {
      setError("콜사인, 찾고 있는 것, 줄 수 있는 것을 두 글자 이상 적어 주세요.");
      return;
    }
    writeDraft({ callsign: callsign.trim(), seek: seek.trim(), offer: offer.trim(), tags });
    router.push("/join/imagine");
  }

  return (
    <main className="cyp">
      <GroveBackdrop />
      <ExperimentKicker />
      <h1 className="display form-title">FORM YOUR NODE</h1>
      <p className="ko center">당신의 NODE를 만들어보세요.</p>

      {exists ? (
        <p className="ko center">
          이 브라우저에는 이미 노드가 있습니다. <a href="/my-node">내 노드 보기</a>
        </p>
      ) : null}

      <section className="block">
        <h2>
          <b>01</b> CALLSIGN
        </h2>
        <p>Choose a name to represent you in the Node Grove.</p>
        <p className="ko">고유한 이름은 다른 NODE와의 첫 만남과 연대를 강화할 연동입니다.</p>
        <input
          className="cyp-input"
          value={callsign}
          maxLength={20}
          placeholder="Enter your callsign..."
          onChange={(event) => setCallsign(event.target.value)}
        />
        <p className="fine">e.g. HEX3 / LUNA / ORBIT / NULL</p>
      </section>

      <section className="block">
        <h2>
          <b>02</b> I SEEK
        </h2>
        <p>What are you looking for right now?</p>
        <p className="ko">지금 찾고 있는 것은 어떤 것인가요?</p>
        <p>Be specific about what you want to do, and the people, skills, knowledge, or resources you need.</p>
        <p className="ko">무엇을 하는지, 그리고 이를 향해 필요한 사람·기술·자원을 구체적으로 적어주세요.</p>
        <textarea
          className="cyp-input"
          rows={4}
          maxLength={180}
          value={seek}
          placeholder="I'm looking for someone or something that can help me..."
          onChange={(event) => setSeek(event.target.value)}
        />
        <button className="ghost-line" type="button" onClick={() => setOpen(open === "seek" ? null : "seek")}>
          {open === "seek" ? "HIDE EXAMPLES ↑" : "SEE EXAMPLES ↓"}
        </button>
        {open === "seek"
          ? SEEK_EXAMPLES.map((example) => (
              <button key={example.en} className="example" type="button" onClick={() => setSeek(example.en)}>
                <span>{example.en}</span>
                <small>{example.ko}</small>
              </button>
            ))
          : null}
      </section>

      <section className="block">
        <h2>
          <b>03</b> I OFFER
        </h2>
        <p>What can you offer to others?</p>
        <p className="ko">다른 사람들에게 어떤 도움을 줄 수 있나요?</p>
        <p className="label">SELECT WHAT YOU CAN BRING</p>
        <p className="ko">당신이 기여할 수 있는 것을 선택 해요. 최대 4개.</p>
        <div className="chips">
          {OFFER_TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button key={tag} type="button" className={on ? "chip on" : "chip"} aria-pressed={on} onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            );
          })}
        </div>
        <p>Tell us what this looks like in practice.</p>
        <p className="ko">실제로 어떤 모습으로 기여할 수 있는지, 혹은 관련 경험을 구체적으로 적어보세요.</p>
        <textarea
          className="cyp-input"
          rows={4}
          maxLength={180}
          value={offer}
          placeholder="I can offer..."
          onChange={(event) => setOffer(event.target.value)}
        />
        <button className="ghost-line" type="button" onClick={() => setOpen(open === "offer" ? null : "offer")}>
          {open === "offer" ? "HIDE EXAMPLES ↑" : "SEE EXAMPLES ↓"}
        </button>
        {open === "offer"
          ? OFFER_EXAMPLES.map((example) => (
              <button key={example.en} className="example" type="button" onClick={() => setOffer(example.en)}>
                <span>{example.en}</span>
                <small>{example.ko}</small>
              </button>
            ))
          : null}
      </section>

      {error ? <p className="cyp-error">{error}</p> : null}
      <button className="cyp-btn" type="button" disabled={exists} onClick={next}>
        <span>
          CONTINUE <i aria-hidden>→</i>
        </span>
      </button>
      <StepMark step={1} />
    </main>
  );
}
