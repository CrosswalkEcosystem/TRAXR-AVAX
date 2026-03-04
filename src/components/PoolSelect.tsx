"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PoolSelectOption = {
  value: string;
  label: string;
  dexLabel: string;
  dexFullLabel?: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  options: PoolSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function PoolSelect({
  value,
  options,
  onChange,
  placeholder = "Select pool",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeDexTooltip, setActiveDexTooltip] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
        setActiveDexTooltip(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative ${open ? "z-[1200]" : "z-20"} ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-[#0f1829] via-[#0c1322] to-[#0a0f1c] px-4 py-2 text-left text-sm text-white outline-none ring-2 ring-transparent transition focus:border-cyan-400/60 focus:ring-cyan-400/30 shadow-[0_0_18px_rgba(0,255,255,0.15)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected?.label || placeholder}
        </span>
        {selected?.dexLabel ? (
          <span className="relative shrink-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveDexTooltip((prev) =>
                  prev === "__selected__" ? null : "__selected__",
                );
              }}
              onMouseEnter={() => setActiveDexTooltip("__selected__")}
              onMouseLeave={() =>
                setActiveDexTooltip((prev) =>
                  prev === "__selected__" ? null : prev,
                )
              }
              className="max-w-[86px] truncate rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-100"
              aria-label={`DEX ${selected.dexFullLabel || selected.dexLabel}`}
            >
              {selected.dexLabel}
            </button>
            {activeDexTooltip === "__selected__" ? (
              <span className="pointer-events-none absolute right-0 top-full z-[1210] mt-1 w-max max-w-[220px] rounded-lg border border-amber-300/30 bg-[#0a1220]/95 px-2 py-1 text-[10px] font-medium text-amber-100 shadow-[0_0_18px_rgba(0,0,0,0.45)]">
                {selected.dexFullLabel || selected.dexLabel}
              </span>
            ) : null}
          </span>
        ) : null}
        <span
          className={`shrink-0 text-[10px] text-white/70 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▲
        </span>
      </button>

      {open ? (
        <div className="absolute z-[1210] mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0b1220]/95 shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur">
          <div role="listbox" className="max-h-80 overflow-auto p-2">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                    setActiveDexTooltip(null);
                  }}
                  className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                    option.disabled
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/25"
                      : isSelected
                        ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                        : "border-white/10 bg-black/20 text-white/80 hover:border-white/25 hover:bg-white/10"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDexTooltip((prev) =>
                          prev === option.value ? null : option.value,
                        );
                      }}
                      onMouseEnter={() => setActiveDexTooltip(option.value)}
                      onMouseLeave={() =>
                        setActiveDexTooltip((prev) =>
                          prev === option.value ? null : prev,
                        )
                      }
                      className="max-w-[86px] truncate rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-100"
                      aria-label={`DEX ${option.dexFullLabel || option.dexLabel}`}
                    >
                      {option.dexLabel}
                    </button>
                    {activeDexTooltip === option.value ? (
                      <span className="pointer-events-none absolute right-0 top-full z-[1220] mt-1 w-max max-w-[220px] rounded-lg border border-amber-300/30 bg-[#0a1220]/95 px-2 py-1 text-[10px] font-medium text-amber-100 shadow-[0_0_18px_rgba(0,0,0,0.45)]">
                        {option.dexFullLabel || option.dexLabel}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
