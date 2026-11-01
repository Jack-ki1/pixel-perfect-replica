import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

export function Avatar({ src, name, className }: { src: string | null; name: string; className?: string }) {
  return src ? <img src={src} alt={name} loading="lazy" className={cn("shrink-0 rounded-full bg-muted object-cover", className)} />
    : <div aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-muted text-xs font-bold", className)}>{name.slice(0, 2).toUpperCase()}</div>;
}

export function Panel({ title, sub, action, children, className }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
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

export function ScoreRing({ value, size = 40, tone = "lime" }: { value: number | null | undefined; size?: number; tone?: "lime" | "violet" | "cyan" }) {
  if (value == null) return <span className="text-[10px] text-muted-foreground">—</span>;
  const t = { lime: "border-lime/70 bg-lime/10 text-lime", violet: "border-violet/70 bg-violet/10 text-violet", cyan: "border-cyan/70 bg-cyan/10 text-cyan" }[tone];
  return <div className={cn("grid shrink-0 place-items-center rounded-full border-2 font-display text-sm font-bold num", t)} style={{ width: size, height: size }}>{Math.round(value)}</div>;
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

export function Bar({ value, max = 10, className }: { value: number; max?: number; className?: string | undefined }) {
  return <div className="h-1.5 flex-1 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full bg-lime", className)} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
