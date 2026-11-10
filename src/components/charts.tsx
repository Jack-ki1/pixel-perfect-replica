// Small themed chart wrappers (recharts) used across the three sections.
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend,
} from "recharts";
import { Panel } from "@/components/br-ui";
import type { ReactNode } from "react";

export const C = ["var(--lime)", "var(--cyan)", "var(--violet)", "var(--amber)", "var(--muted-foreground)"];
const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }, cursor: { fill: "var(--accent)", opacity: 0.4 } };

function Frame({ title, sub, children, empty, h = 220 }: { title: string; sub?: string | undefined; children: ReactNode; empty?: boolean; h?: number }) {
  return (
    <Panel title={title} sub={sub}>
      <div style={{ height: h }}>
        {empty ? <div className="grid h-full place-items-center text-xs text-muted-foreground">Not enough live data yet</div>
          : <ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer>}
      </div>
    </Panel>
  );
}

export type Datum = { name: string; value: number };

export function BarPlot({ title, sub, data, color = 0, horizontal }: { title: string; sub?: string | undefined; data: Datum[]; color?: number; horizontal?: boolean }) {
  return (
    <Frame title={title} sub={sub} empty={!data.length}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 10 : -20, right: 8, top: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        {horizontal ? <><XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" width={90} {...axis} /></>
          : <><XAxis dataKey="name" {...axis} /><YAxis allowDecimals={false} {...axis} /></>}
        <Tooltip {...tip} />
        <Bar dataKey="value" fill={C[color]} radius={4} />
      </BarChart>
    </Frame>
  );
}

export function DonutPlot({ title, sub, data }: { title: string; sub?: string | undefined; data: Datum[] }) {
  return (
    <Frame title={title} sub={sub} empty={!data.some((d) => d.value)}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </Frame>
  );
}

export function ScatterPlot({ title, sub, data, x, y }: { title: string; sub?: string | undefined; data: { name: string; x: number; y: number }[]; x: string; y: string }) {
  return (
    <Frame title={title} sub={sub} empty={!data.length}>
      <ScatterChart margin={{ left: -10, right: 10, top: 6 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name={x} {...axis} />
        <YAxis type="number" dataKey="y" name={y} {...axis} />
        <ZAxis range={[40, 40]} />
        <Tooltip {...tip} formatter={(v: number) => v} labelFormatter={() => ""} content={({ payload }) => payload?.[0] ? (
          <div style={tip.contentStyle} className="px-2 py-1"><b>{(payload[0].payload as { name: string }).name}</b><div>{x}: {payload[0].payload.x}</div><div>{y}: {payload[0].payload.y}</div></div>) : null} />
        <Scatter data={data} fill={C[1]} />
      </ScatterChart>
    </Frame>
  );
}

export function RadarPlot({ title, sub, data }: { title: string; sub?: string | undefined; data: Datum[] }) {
  return (
    <Frame title={title} sub={sub} empty={!data.some((d) => d.value)} h={240}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={C[2]} fill={C[2]} fillOpacity={0.35} />
        <Tooltip {...tip} />
      </RadarChart>
    </Frame>
  );
}

export function AreaPlot({ title, sub, data, keys }: { title: string; sub?: string | undefined; data: Record<string, number | string>[]; keys: string[] }) {
  return (
    <Frame title={title} sub={sub} empty={!data.length}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" {...axis} /><YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={C[i]} fill={C[i]} fillOpacity={0.15} />)}
      </AreaChart>
    </Frame>
  );
}

/** Bucket numbers into labelled bins. */
export function histogram(values: number[], edges: number[], label = (lo: number, hi: number) => `${lo}–${hi}`): Datum[] {
  return edges.slice(0, -1).map((lo, i) => ({ name: label(lo, edges[i + 1]!), value: values.filter((v) => v >= lo && v < edges[i + 1]!).length }));
}
export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined, top = 8): Datum[] {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = key(r) || "Unknown"; m.set(k, (m.get(k) ?? 0) + 1); });
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, top);
}
