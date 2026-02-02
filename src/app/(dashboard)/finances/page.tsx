"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { PendingPaymentsTable } from "@/components/payments/PendingPaymentsTable";
import { AllPaymentsTable } from "@/components/payments/AllPaymentsTable";
import { useTransactions } from "@/hooks/use-transactions";
import { useAllPayments } from "@/hooks/use-payment-submissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { formatCurrency } from "@/types/transaction";
import { isAdmin } from "@/types/profile";
import { cn } from "@/lib/utils";

export default function FinancesPage() {
  const { data: profile } = useCurrentProfile();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: payments = [], isLoading: paymentsLoading } = useAllPayments();

  const isLoading = transactionsLoading || paymentsLoading;
  const userIsAdmin = isAdmin(profile);

  // Calcular resumen combinando transacciones + pagos de cuotas aprobados
  const summary = useMemo(() => {
    // Ingresos de transacciones
    const transactionIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Gastos de transacciones
    const transactionExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Ingresos de pagos de cuotas aprobados
    const approvedPaymentsIncome = payments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalIncome = transactionIncome + approvedPaymentsIncome;
    const totalExpense = transactionExpense;
    const netProfit = totalIncome - totalExpense;

    return { totalIncome, totalExpense, netProfit };
  }, [transactions, payments]);

  // Crear datos del grafico combinando transacciones + pagos aprobados
  const combinedChartData = useMemo(() => {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyData: Record<string, { income: number; expense: number }> = {};

    // Agregar transacciones
    transactions.forEach((t) => {
      const monthKey = t.date.slice(0, 7); // "2025-01"
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }
      if (t.type === "income") {
        monthlyData[monthKey].income += Number(t.amount);
      } else {
        monthlyData[monthKey].expense += Number(t.amount);
      }
    });

    // Agregar pagos de cuotas aprobados como ingresos
    payments
      .filter((p) => p.status === "approved")
      .forEach((p) => {
        const date = p.reviewed_at || p.submitted_at;
        const monthKey = date.slice(0, 7);
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        monthlyData[monthKey].income += Number(p.amount);
      });

    // Convertir a formato de grafico y ordenar
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        return {
          date: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
          income: value.income,
          expense: value.expense,
          net: value.income - value.expense,
        };
      });
  }, [transactions, payments]);

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

      {/* Pagos Pendientes de Aprobacion (solo admin) */}
      {userIsAdmin && <PendingPaymentsTable />}

      {/* Historial de todos los pagos (solo admin) */}
      {userIsAdmin && <AllPaymentsTable />}

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
      {isLoading ? (
        <Skeleton className="h-[350px]" />
      ) : combinedChartData && combinedChartData.length > 0 ? (
        <FinancialOverview data={combinedChartData} />
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
