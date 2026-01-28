import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin } from "@/types/profile";
import type { FinancialDataPoint } from "@/types/transaction";

export default async function DashboardPage() {
  const supabase = await createClient();

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

  const userIsAdmin = isAdmin(profile);

  // Obtener datos financieros (solo si es admin)
  let financialData: FinancialDataPoint[] = [];

  if (userIsAdmin) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, type, date")
      .gte("date", sixMonthsAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    // Agrupar por mes
    financialData = aggregateByMonth(transactions ?? []);
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

// Helper para agregar datos por mes
function aggregateByMonth(
  transactions: { amount: number; type: string; date: string }[]
): FinancialDataPoint[] {
  const months: Record<string, { income: number; expense: number }> = {};

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
