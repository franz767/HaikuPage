import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PrefetchData } from "@/components/layout/prefetch-data";
import { SessionValidator } from "@/components/auth/session-validator";
import { isAdmin, isClient } from "@/types/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verificar autenticacion
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const userIsAdmin = isAdmin(profile);
  const userIsClient = isClient(profile);

  return (
    <div className="min-h-screen bg-background">
      {/* Validar sesión única para admins */}
      <SessionValidator />

      {/* Prefetch datos críticos en background */}
      <PrefetchData />

      {/* Sidebar */}
      <Sidebar isAdmin={userIsAdmin} isClient={userIsClient} />

      {/* Main content */}
      <div className="pl-64">
        <Header
          user={{
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: profile.role,
          }}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}


