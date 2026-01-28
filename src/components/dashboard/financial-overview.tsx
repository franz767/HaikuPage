"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialDataPoint } from "@/types/transaction";
import { formatCurrency } from "@/types/transaction";

interface FinancialOverviewProps {
  data: FinancialDataPoint[];
  className?: string;
}

export function FinancialOverview({ data, className }: FinancialOverviewProps) {
  // Calcular totales y tendencia
  const stats = useMemo(() => {
    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
    const netProfit = totalIncome - totalExpense;

    // Calcular tendencia comparando primera y segunda mitad
    const midpoint = Math.floor(data.length / 2);
    const firstHalfNet = data
      .slice(0, midpoint)
      .reduce((sum, d) => sum + d.net, 0);
    const secondHalfNet = data.slice(midpoint).reduce((sum, d) => sum + d.net, 0);
    const trend = secondHalfNet - firstHalfNet;

    return { totalIncome, totalExpense, netProfit, trend };
  }, [data]);

  const TrendIcon =
    stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor =
    stats.trend > 0
      ? "text-emerald-600"
      : stats.trend < 0
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Resumen Financiero
          </CardTitle>
          <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span>
              {stats.trend > 0 ? "+" : ""}
              {formatCurrency(stats.trend)}
            </span>
          </div>
        </div>

        {/* Mini stats row - estilo Midday */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Ingresos
            </p>
            <p className="text-xl font-semibold text-primary">
              {formatCurrency(stats.totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Gastos
            </p>
            <p className="text-xl font-semibold text-chart-2">
              {formatCurrency(stats.totalExpense)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Neto
            </p>
            <p
              className={cn(
                "text-xl font-semibold",
                stats.netProfit >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              {formatCurrency(stats.netProfit)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Gradiente para ingresos - Verde */}
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(142, 43%, 35%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(142, 43%, 35%)"
                    stopOpacity={0}
                  />
                </linearGradient>
                {/* Gradiente para gastos - Terracota */}
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(20, 72%, 55%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(20, 72%, 55%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value / 1000}k`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={45}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-medium">{label}</p>
                      {payload.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {item.name === "income" ? "Ingresos" : "Gastos"}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              {/* Area de ingresos */}
              <Area
                type="monotone"
                dataKey="income"
                stroke="hsl(142, 43%, 35%)"
                strokeWidth={2}
                fill="url(#incomeGradient)"
              />

              {/* Area de gastos */}
              <Area
                type="monotone"
                dataKey="expense"
                stroke="hsl(20, 72%, 55%)"
                strokeWidth={2}
                fill="url(#expenseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
