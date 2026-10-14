import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { portraitStyle, INTEGRITY_LABEL } from "@/lib/artists";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 24" className="h-6 w-8 text-lime" aria-hidden>
        <path d="M1 12h5l3-8 5 16 4-12 3 6 3-2h7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-sm font-bold tracking-wide">BREAKOUT <span className="text-lime">RADAR</span></div>
        <div className="text-[10px] text-muted-foreground">A&R Intelligence</div>
      </div>
    </div>
  );
}

export function Portrait({ seed, className, name }: { seed: number; className?: string; name: string }) {
  return <div role="img" aria-label={`Portrait of ${name} (demo)`} className={cn("shrink-0 rounded-full bg-muted", className)} style={portraitStyle(seed)} />;
}

export function DemoBadge() {
  return <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">Demo</span>;
}

export function Panel({ title, sub, action, children, className }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function ScoreRing({ value, size = 40 }: { value: number | null | undefined; size?: number }) {
  if (value == null) return <span className="text-[10px] text-muted-foreground">Insufficient evidence</span>;
  return (
    <div className="grid place-items-center rounded-full border-2 border-lime/70 bg-lime/10 font-display text-sm font-bold text-lime num" style={{ width: size, height: size }}>
      {value}
    </div>
  );
}

const integrityTone: Record<string, string> = {
  organic: "border-lime/40 bg-lime/10 text-lime",
  paid_promo: "border-cyan/40 bg-cyan/10 text-cyan",
  unknown: "border-border bg-muted text-muted-foreground",
  suspicious: "border-amber/40 bg-amber/10 text-amber",
  confirmed_invalid: "border-destructive/40 bg-destructive/10 text-destructive",
};
export function IntegrityChip({ value }: { value: string }) {
  return <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", integrityTone[value])}>{INTEGRITY_LABEL[value] ?? value}</span>;
}

export function Kpi({ icon, value, label, tone = "lime" }: { icon: ReactNode; value: ReactNode; label: string; tone?: "lime" | "cyan" | "violet" | "amber" }) {
  const tones = { lime: "bg-lime/15 text-lime", cyan: "bg-cyan/15 text-cyan", violet: "bg-violet/20 text-violet", amber: "bg-amber/15 text-amber" };
  return (
    <div className="panel p-4">
      <div className={cn("mb-3 grid size-9 place-items-center rounded-lg", tones[tone])}>{icon}</div>
      <div className="font-display text-2xl font-bold num">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
