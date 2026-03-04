type Props = {
  warnings: string[];
};

type WarningLevel = "risk" | "info";

function classifyWarning(warning: string): WarningLevel {
  const text = warning.toLowerCase();
  if (
    text.includes("dependency") ||
    text.includes("dependencies") ||
    text.includes("admin or owner controls present")
  ) {
    return "info";
  }
  return "risk";
}

// TRAXR signal list for a pool.
export function TraxrWarnings({ warnings }: Props) {
  if (!warnings.length) {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-emerald-100">
        No active risk signals. TRAXR nodes in nominal band.
      </div>
    );
  }

  const tagged = warnings.map((warning) => ({
    warning,
    level: classifyWarning(warning),
  }));
  const riskCount = tagged.filter((w) => w.level === "risk").length;
  const infoCount = tagged.length - riskCount;

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-50">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.26em] text-amber-200/80">
        <span>Signals</span>
        <span className="text-[10px] tracking-[0.2em] text-white/60">
          Risk {riskCount} | Info {infoCount}
        </span>
      </div>
      <ul className="space-y-1 text-sm">
        {tagged.map(({ warning, level }) => (
          <li key={warning} className="flex items-start gap-2">
            <span
              className={`mt-[4px] h-1.5 w-1.5 rounded-full ${
                level === "risk" ? "bg-amber-300" : "bg-cyan-300"
              }`}
            />
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                level === "risk"
                  ? "border-amber-300/40 bg-amber-500/20 text-amber-100"
                  : "border-cyan-300/40 bg-cyan-500/20 text-cyan-100"
              }`}
            >
              {level}
            </span>
            <span>{warning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
