"use client";

import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { useFinancialChartData, useFinancialSummary } from "@/hooks/use-transactions";
import { formatCurrency } from "@/types/transaction";
import { cn } from "@/lib/utils";

export default function FinancesPage() {
  const { data: chartData, isLoading: chartLoading } = useFinancialChartData(6);
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();

  const isLoading = chartLoading || summaryLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground">
            Resumen financiero de tu agencia
          </p>
        </div>
        <Button asChild>
          <Link href="/finances/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Transaccion
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos Totales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(summary?.totalIncome ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos Totales
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-red-500">
                {formatCurrency(summary?.totalExpense ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance Neto
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p
                className={cn(
                  "text-2xl font-bold",
                  (summary?.netProfit ?? 0) >= 0
                    ? "text-emerald-600"
                    : "text-red-500"
                )}
              >
                {formatCurrency(summary?.netProfit ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartLoading ? (
        <Skeleton className="h-[350px]" />
      ) : chartData && chartData.length > 0 ? (
        <FinancialOverview data={chartData} />
      ) : (
        <Card>
          <CardContent className="flex h-[350px] items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">
                No hay datos financieros para mostrar
              </p>
              <Button className="mt-4" asChild>
                <Link href="/finances/new">Agregar transaccion</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
