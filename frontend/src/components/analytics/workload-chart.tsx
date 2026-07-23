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

export function WorkloadChart({ workload }: { workload: WorkloadItem[] }) {
  const data = workload.map((w) => ({
    name: w.name.length > 14 ? `${w.name.slice(0, 12)}…` : w.name,
    fullName: w.name,
    total: w.total,
    completed: w.completed,
    open: Math.max(0, w.total - w.completed),
  }));

  return (
    <Card className="rounded-lg border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Üye İş Yükü</CardTitle>
        <CardDescription>
          Atanan görevler ve tamamlananlar (kullanıcı bazlı)
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Atanmış görev bulunamadı
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
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
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
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
