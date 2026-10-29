"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const LEAF = "#2F6B2A";
const GRID = "#E4DCCB";
const INK_SOFT = "#5A5650";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Tip({ active, payload, label, money }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-small shadow-sm">
      <p className="text-ink-soft">{label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? shortDay(label) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium tabular-nums">
          {money ? inr(p.value) : p.value.toLocaleString("en-IN")} <span className="font-normal text-ink-soft">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

/** One measure over time. A second measure gets its own chart, never a second axis. */
export function TrendChart({
  data,
  dataKey,
  name,
  money = false,
  height = 240,
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  name: string;
  money?: boolean;
  height?: number;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`${name} by day`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LEAF} stopOpacity={0.18} />
              <stop offset="100%" stopColor={LEAF} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: INK_SOFT, fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis
            tick={{ fill: INK_SOFT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={money ? 64 : 36}
            tickFormatter={(v: number) => (money ? inr(v) : String(v))}
            allowDecimals={false}
          />
          <Tooltip content={<Tip money={money} />} cursor={{ stroke: INK_SOFT, strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke={LEAF} strokeWidth={2} fill={`url(#fill-${dataKey})`} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars, sorted, one colour: magnitude only. */
export function RankBars({ data, dataKey, nameKey = "name", name, money = false }: { data: Record<string, number | string>[]; dataKey: string; nameKey?: string; name: string; money?: boolean }) {
  const h = Math.max(120, data.length * 34 + 16);
  return (
    <div style={{ height: h }} role="img" aria-label={name}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey={nameKey} width={140} tick={{ fill: "#1B1A17", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip money={money} />} cursor={{ fill: "rgb(27 26 23 / 0.04)" }} />
          <Bar dataKey={dataKey} name={name} fill={LEAF} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
