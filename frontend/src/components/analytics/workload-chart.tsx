"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
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

const WORKLOAD_COLORS = [
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
];

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
          Üye başına atanan görev sayısı
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
              <Bar dataKey="total" name="Görev" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={WORKLOAD_COLORS[index % WORKLOAD_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
