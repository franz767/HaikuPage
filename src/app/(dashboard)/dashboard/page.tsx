import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin, isClient } from "@/types/profile";
import type { FinancialDataPoint } from "@/types/transaction";
import type { Database } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient<Database>();

  // Obtener usuario y perfil
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Si es cliente, redirigir directo a proyectos
  if (isClient(profile)) {
    redirect("/projects");
  }

  const userIsAdmin = isAdmin(profile);

  // Obtener datos financieros (solo si es admin)
  let financialData: FinancialDataPoint[] = [];

  if (userIsAdmin) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Obtener transacciones
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, type, date")
      .gte("date", sixMonthsAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    // Obtener pagos de cuotas aprobados
    const { data: approvedPayments } = await supabase
      .from("payment_submissions")
      .select("amount, submitted_at, reviewed_at, status")
      .eq("status", "approved")
      .gte("submitted_at", sixMonthsAgo.toISOString())
      .order("submitted_at", { ascending: true });

    // Agrupar por mes combinando transacciones + pagos aprobados
    financialData = aggregateByMonth(transactions ?? [], approvedPayments ?? []);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido, {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Aqui tienes un resumen de tu actividad
        </p>
      </div>

      {/* Bento Grid - estilo Midday */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Financial Overview - Solo Admin, span 2 columnas */}
        {userIsAdmin && financialData.length > 0 && (
          <div className="md:col-span-2">
            <Suspense fallback={<Skeleton className="h-[350px]" />}>
              <FinancialOverview data={financialData} />
            </Suspense>
          </div>
        )}

        {/* Quick Actions */}
        <div className={userIsAdmin ? "" : "md:col-span-2"}>
          <QuickActions isAdmin={userIsAdmin} />
        </div>

        {/* Projects Summary - span 2 columnas */}
        <div className="md:col-span-2 lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-[300px]" />}>
            <ProjectsSummary />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// Helper para agregar datos por mes (transacciones + pagos aprobados)
function aggregateByMonth(
  transactions: { amount: number; type: string; date: string }[],
  approvedPayments: { amount: number; submitted_at: string; reviewed_at: string | null; status: string }[] = []
): FinancialDataPoint[] {
  const months: Record<string, { income: number; expense: number }> = {};

  // Agregar transacciones
  transactions.forEach((t) => {
    const monthKey = t.date.slice(0, 7); // "2025-01"
    if (!months[monthKey]) {
      months[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === "income") {
      months[monthKey].income += Number(t.amount);
    } else {
      months[monthKey].expense += Number(t.amount);
    }
  });

  // Agregar pagos de cuotas aprobados como ingresos
  approvedPayments.forEach((p) => {
    const date = p.reviewed_at || p.submitted_at;
    const monthKey = date.slice(0, 7);
    if (!months[monthKey]) {
      months[monthKey] = { income: 0, expense: 0 };
    }
    months[monthKey].income += Number(p.amount);
  });

  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  return Object.entries(months)
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
}
