'use client';

import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { AIChartSpec } from '@/lib/ai/types';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

/** Charts are built only from tool results (server-validated), never from model-written numbers. */
export default function AIChart({ chart }: { chart: AIChartSpec }) {
  const config = useMemo<ChartConfig>(() => {
    const out: ChartConfig = {};
    chart.series.forEach((s, i) => {
      out[s.key] = { label: s.label, color: COLORS[i % COLORS.length] };
    });
    return out;
  }, [chart.series]);

  const formatValue = (value: number) => {
    if (chart.valueFormat === 'percent') return `${value}%`;
    if (chart.valueFormat === 'currency') return `${value.toLocaleString()}${chart.currency ? ` ${chart.currency}` : ''}`;
    return value.toLocaleString();
  };

  if (!chart.data.length) return null;

  return (
    <figure className="mt-3 rounded-xl border border-border bg-background/60 p-3" dir="ltr">
      <figcaption className="mb-2 text-xs font-semibold text-muted-foreground">{chart.title}</figcaption>
      <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
        {chart.type === 'pie' ? (
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
            <Pie data={chart.data} dataKey={chart.series[0].key} nameKey="label" innerRadius={40} outerRadius={75}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : chart.type === 'line' ? (
          <LineChart data={chart.data} margin={{ left: 4, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={16} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} width={44} fontSize={11} tickFormatter={formatValue} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {chart.series.map((s) => (
              <Line key={s.key} dataKey={s.key} type="monotone" stroke={`var(--color-${s.key})`} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chart.data} margin={{ left: 4, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={8} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} width={44} fontSize={11} tickFormatter={formatValue} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {chart.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
            {chart.series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={4} />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </figure>
  );
}
