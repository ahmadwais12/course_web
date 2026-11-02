'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState, SectionPanel } from '@/components/ports';

const CHART_BOX = 'min-h-[220px] w-full aspect-auto h-[240px] sm:h-[280px]';

type NamedValue = { name: string; value: number; fill?: string };

export function DashboardAreaChart({
  title,
  description,
  data,
  config,
  headerRight,
}: {
  title: string;
  description?: string;
  data: Array<Record<string, string | number>>;
  config: ChartConfig;
  headerRight?: React.ReactNode;
}) {
  const keys = Object.keys(config);
  return (
    <SectionPanel title={title} description={description} headerRight={headerRight}>
      {data.length ? (
        <ChartContainer config={config} className={CHART_BOX}>
          <AreaChart accessibilityLayer data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={18} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {keys.map((key, index) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                fill={`var(--color-${key})`}
                fillOpacity={0.18}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                stackId={index === 0 ? undefined : undefined}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      ) : (
        <EmptyState title="No trend data" description="Nothing recorded for this period." />
      )}
    </SectionPanel>
  );
}

export function DashboardBarChart({
  title,
  description,
  data,
  config,
  layout = 'vertical',
  stacked = false,
}: {
  title: string;
  description?: string;
  data: Array<Record<string, string | number>>;
  config: ChartConfig;
  layout?: 'vertical' | 'horizontal';
  stacked?: boolean;
}) {
  const keys = Object.keys(config);
  return (
    <SectionPanel title={title} description={description}>
      {data.length ? (
        <ChartContainer config={config} className={CHART_BOX}>
          <BarChart
            accessibilityLayer
            data={data}
            layout={layout === 'horizontal' ? 'vertical' : 'horizontal'}
            margin={{ left: 8, right: 8, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            {layout === 'horizontal' ? (
              <>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={32} />
              </>
            )}
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {keys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={6}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ChartContainer>
      ) : (
        <EmptyState title="No chart data" description="Nothing recorded for this view." />
      )}
    </SectionPanel>
  );
}

export function DashboardPieChart({
  title,
  description,
  data,
  config,
}: {
  title: string;
  description?: string;
  data: NamedValue[];
  config: ChartConfig;
}) {
  return (
    <SectionPanel title={title} description={description}>
      {data.length ? (
        <ChartContainer config={config} className={CHART_BOX}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} strokeWidth={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill || `var(--color-${entry.name})`} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      ) : (
        <EmptyState title="No mix data" description="Nothing recorded for this period." />
      )}
    </SectionPanel>
  );
}
