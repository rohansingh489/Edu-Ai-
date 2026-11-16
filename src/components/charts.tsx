"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = { name: string; value: number };
const COLORS = ["#1f3d75", "#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function BarCard({ title, data, unit = "" }: { title: string; data: Datum[]; unit?: string }) {
  return (
    <div className="card">
      <h3 className="mb-3 font-bold text-navy-900">{title}</h3>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No data yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}${unit}`} />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function PieCard({ title, data }: { title: string; data: Datum[] }) {
  const filtered = data.filter((d) => d.value > 0);
  return (
    <div className="card">
      <h3 className="mb-3 font-bold text-navy-900">{title}</h3>
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No data yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {filtered.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
