"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSlice, WorkloadItem } from "@/app/actions/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHART_H = 220;

function ColorBadges({
  items,
}: {
  items: { key: string; label: string; color: string; count: number }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-2 px-2">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
          <span className="font-medium text-foreground">{item.count}</span>
        </span>
      ))}
    </div>
  );
}

function EmptyChartHint() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <div className="size-16 rounded-full border-4 border-dashed border-muted-foreground/30" />
      <p className="text-sm">Henüz veri yok</p>
    </div>
  );
}

/** Durum dağılımı — Donut */
export function StatusDonutCard({
  data,
  className,
}: {
  data: ChartSlice[];
  className?: string;
}) {
  const palette: Record<string, string> = {
    TODO: "#f59e0b",
    IN_PROGRESS: "#6366f1",
    DONE: "#10b981",
  };
  const chartData = data.map((d) => ({
    ...d,
    fill: palette[d.key] ?? d.fill,
  }));
  const hasData = chartData.some((d) => d.count > 0);

  return (
    <Card
      className={cn(
        "gap-0 rounded-lg border-border py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="space-y-1 px-4 pt-4 pb-1">
        <CardTitle className="text-sm font-semibold">Durum Dağılımı</CardTitle>
        <CardDescription className="text-xs">
          Yapılacak · Devam ediyor · Tamamlandı
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <div className="w-full" style={{ height: CHART_H }}>
          {!hasData ? (
            <EmptyChartHint />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value ?? 0} görev`, "Adet"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ColorBadges
          items={chartData.map((d) => ({
            key: d.key,
            label: d.label,
            color: d.fill,
            count: d.count,
          }))}
        />
      </CardContent>
    </Card>
  );
}

/** Öncelik yoğunluğu — dikey Bar */
export function PriorityBarCard({
  data,
  className,
}: {
  data: ChartSlice[];
  className?: string;
}) {
  const palette: Record<string, string> = {
    HIGH: "#f43f5e",
    MEDIUM: "#f59e0b",
    LOW: "#64748b",
  };
  const chartData = data.map((d) => ({
    ...d,
    fill: palette[d.key] ?? d.fill,
  }));
  const hasData = chartData.some((d) => d.count > 0);

  return (
    <Card
      className={cn(
        "gap-0 rounded-lg border-border py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="space-y-1 px-4 pt-4 pb-1">
        <CardTitle className="text-sm font-semibold">Öncelik Yoğunluğu</CardTitle>
        <CardDescription className="text-xs">
          Yüksek · Orta · Düşük
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <div className="w-full" style={{ height: CHART_H }}>
          {!hasData ? (
            <EmptyChartHint />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} görev`, "Adet"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="Görev" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <ColorBadges
          items={chartData.map((d) => ({
            key: d.key,
            label: d.label,
            color: d.fill,
            count: d.count,
          }))}
        />
      </CardContent>
    </Card>
  );
}

/** Üye iş yükü — stacked Bar */
export function WorkloadBarCard({
  workload,
  className,
}: {
  workload: WorkloadItem[];
  className?: string;
}) {
  const chartData = workload.map((w) => ({
    name: w.name.length > 10 ? `${w.name.slice(0, 8)}…` : w.name,
    fullName: w.name,
    total: w.total,
    completed: w.completed,
    open: Math.max(0, w.total - w.completed),
  }));

  return (
    <Card
      className={cn(
        "gap-0 rounded-lg border-border py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="space-y-1 px-4 pt-4 pb-1">
        <CardTitle className="text-sm font-semibold">Üye İş Yükü</CardTitle>
        <CardDescription className="text-xs">
          Atanan / tamamlanan görevler
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <div className="w-full" style={{ height: CHART_H }}>
          {chartData.length === 0 ? (
            <EmptyChartHint />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload as
                      | { fullName?: string }
                      | undefined;
                    return item?.fullName ?? "";
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="open"
                  name="Açık"
                  stackId="a"
                  fill="#6366f1"
                />
                <Bar
                  dataKey="completed"
                  name="Tamamlanan"
                  stackId="a"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {chartData.length > 0 ? (
          <ColorBadges
            items={[
              {
                key: "open",
                label: "Açık",
                color: "#6366f1",
                count: chartData.reduce((s, d) => s + d.open, 0),
              },
              {
                key: "done",
                label: "Tamamlanan",
                color: "#10b981",
                count: chartData.reduce((s, d) => s + d.completed, 0),
              },
            ]}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
