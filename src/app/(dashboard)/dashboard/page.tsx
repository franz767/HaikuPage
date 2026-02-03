import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FinancialMetricsWidget } from "@/components/dashboard/financial-metrics-widget";
import { ProjectsStatsTable } from "@/components/dashboard/projects-stats-table";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin, isClient, type Profile } from "@/types/profile";
import type { FinancialDataPoint } from "@/types/transaction";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Obtener usuario y perfil
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileData) redirect("/login");

  const profile = profileData as Profile;

  // Si es cliente, redirigir directo a proyectos
  if (isClient(profile)) {
    redirect("/projects");
  }

  const userIsAdmin = isAdmin(profile);

  // Obtener datos financieros (solo si es admin)
  let transactionsData: any[] = [];
  let paymentsData: any[] = [];

  if (userIsAdmin) {
    // Traemos datos de 1 año (12 meses) para permitir el filtrado histórico en el cliente de forma fluida
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

    // Obtener transacciones
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, type, date")
      .gte("date", oneYearAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    // Obtener pagos de cuotas aprobados
    const { data: approvedPayments } = await supabase
      .from("payment_submissions")
      .select("amount, submitted_at, reviewed_at, status")
      .eq("status", "approved")
      .gte("submitted_at", oneYearAgo.toISOString())
      .order("submitted_at", { ascending: true });

    transactionsData = transactions ?? [];
    paymentsData = approvedPayments ?? [];
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
        {userIsAdmin && (
          <div className="md:col-span-2">
            <Suspense fallback={<Skeleton className="h-[350px]" />}>
              <FinancialMetricsWidget
                transactions={transactionsData}
                payments={paymentsData}
              />
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
            {userIsAdmin ? <ProjectsStatsTable /> : <ProjectsSummary />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
