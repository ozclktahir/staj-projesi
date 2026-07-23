"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartSlice } from "@/app/actions/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHART_BODY_H = "h-[220px]";

export function DistributionPieChart({
  title,
  description,
  data,
  className,
}: {
  title: string;
  description: string;
  data: ChartSlice[];
  className?: string;
}) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card
      className={cn(
        "flex h-full flex-col rounded-lg border-border py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="shrink-0 space-y-1 px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn("min-h-0 flex-1 px-2 pb-3", CHART_BODY_H)}>
        {!hasData ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Henüz veri yok
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                stroke="transparent"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value ?? 0} görev`, ""]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value) => (
                  <span className="text-[11px] text-muted-foreground">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Geriye dönük sarmalayıcı */
export function StatusPriorityCharts({
  byStatus,
  byPriority,
  stacked = false,
}: {
  byStatus: ChartSlice[];
  byPriority: ChartSlice[];
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "grid gap-4" : "grid gap-4 lg:grid-cols-2"}>
      <DistributionPieChart
        title="Durum Dağılımı"
        description="Yapılacak · Devam ediyor · Tamamlandı"
        data={byStatus}
      />
      <DistributionPieChart
        title="Öncelik Yoğunluğu"
        description="Yüksek · Orta · Düşük"
        data={byPriority}
      />
    </div>
  );
}
