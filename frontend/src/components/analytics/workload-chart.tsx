"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WorkloadItem } from "@/app/actions/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WorkloadChart({
  workload,
  className,
}: {
  workload: WorkloadItem[];
  className?: string;
}) {
  const data = workload.map((w) => ({
    name: w.name.length > 10 ? `${w.name.slice(0, 8)}…` : w.name,
    fullName: w.name,
    total: w.total,
    completed: w.completed,
    open: Math.max(0, w.total - w.completed),
  }));

  return (
    <Card
      className={cn(
        "flex h-full flex-col rounded-lg border-border py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="shrink-0 space-y-1 px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold">Üye İş Yükü</CardTitle>
        <CardDescription className="text-xs">
          Atanan / tamamlanan görevler
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[220px] min-h-0 flex-1 px-2 pb-3">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Atanmış görev bulunamadı
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
                width={24}
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
              <Legend
                formatter={(value) => (
                  <span className="text-[11px] text-muted-foreground">
                    {value}
                  </span>
                )}
              />
              <Bar
                dataKey="open"
                name="Açık"
                stackId="a"
                fill="#6366f1"
                radius={[0, 0, 0, 0]}
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
      </CardContent>
    </Card>
  );
}
