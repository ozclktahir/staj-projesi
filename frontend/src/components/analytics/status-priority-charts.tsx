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

function DualPieBlock({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: ChartSlice[];
}) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="rounded-lg border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
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
                innerRadius={58}
                outerRadius={88}
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
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

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
      <DualPieBlock
        title="Durum Dağılımı"
        description="Yapılacak · Devam ediyor · Tamamlandı"
        data={byStatus}
      />
      <DualPieBlock
        title="Öncelik Yoğunluğu"
        description="Yüksek · Orta · Düşük"
        data={byPriority}
      />
    </div>
  );
}
