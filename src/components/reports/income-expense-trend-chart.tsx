"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short" }).format(value);
}

export function IncomeExpenseTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full print:hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={formatCompact} />
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
                value
              )
            }
          />
          <Legend />
          <Bar dataKey="income" name="Pemasukan" fill="hsl(152, 76%, 30%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Pengeluaran" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
