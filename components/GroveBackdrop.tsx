export function GroveBackdrop() {
  return (
    <svg className="grove-bg" viewBox="0 0 400 800" aria-hidden>
      <defs>
        <radialGradient id="grove-glow" cx="50%" cy="42%" r="48%">
          <stop offset="0%" stopColor="#1cff8a" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#04140c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="url(#grove-glow)" />
      <g fill="none" stroke="#1cff8a" strokeOpacity="0.28" strokeWidth="0.6">
        <path d="M20 140 C80 80 140 200 200 120 S320 40 380 150" />
        <path d="M10 420 C90 360 150 500 230 390 S340 470 390 360" />
        <path d="M30 640 C120 700 180 560 260 650 S340 720 380 600" />
      </g>
      <g fill="#b8ffd8">
        <circle cx="48" cy="168" r="1.4" />
        <circle cx="126" cy="96" r="1.1" />
        <circle cx="210" cy="150" r="1.6" />
        <circle cx="300" cy="84" r="1.2" />
        <circle cx="62" cy="390" r="1.3" />
        <circle cx="188" cy="430" r="1.8" />
        <circle cx="340" cy="360" r="1.2" />
        <circle cx="90" cy="670" r="1.4" />
        <circle cx="250" cy="620" r="1.7" />
        <circle cx="360" cy="690" r="1.1" />
      </g>
    </svg>
  );
}

export function ExperimentKicker() {
  return <p className="kicker">CYP3 | PROOF OF COEXISTENCE EXPERIMENT - 001</p>;
}

export function StepMark({ step }: { step: 1 | 2 }) {
  return (
    <p className="step-mark" aria-label={`${step} / 2`}>
      <i className={step === 1 ? "on" : ""} />
      <i className={step === 2 ? "on" : ""} />
      <span>
        {step} / 2
      </span>
    </p>
  );
}
