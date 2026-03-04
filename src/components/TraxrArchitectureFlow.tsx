export default function TraxrArchitectureFlow() {
  return (
    <div className="mt-10 w-full">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
        <Node
          title="Avalanche C-Chain RPC"
          subtitle="Primary source"
          tone="cyan"
        />
        <Arrow />
        <Node
          title="Normalization"
          subtitle="Deterministic schema"
          tone="blue"
        />
        <Arrow />
        <Node
          title="Scoring (npm)"
          subtitle="@crosswalk.pro/traxr-cts-avax"
          tone="emerald"
        />
        <Arrow />
        <Node
          title="API + UI"
          subtitle="Read-only distribution"
          tone="violet"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
        <span className="font-semibold uppercase tracking-[0.14em]">Baseline Verification</span>
        <span className="mx-2 text-amber-200/60">|</span>
        GeckoTerminal snapshots are retained for parity checks and source-segmented trend history, not as primary ingestion.
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Read-only architecture. No signing. No custody. Explicit provenance.
      </p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-cyan-200/70">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M4 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m13 7 6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Node({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "cyan" | "blue" | "emerald" | "violet";
}) {
  const tones: Record<typeof tone, string> = {
    cyan: "border-cyan-300/40 bg-cyan-400/10",
    blue: "border-sky-300/35 bg-sky-400/10",
    emerald: "border-emerald-300/35 bg-emerald-400/10",
    violet: "border-indigo-300/35 bg-indigo-400/10",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs text-white/70">{subtitle}</div>
    </div>
  );
}
