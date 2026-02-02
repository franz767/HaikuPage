"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import type { Database } from "@/types/database";

export function SessionValidator() {
  const router = useRouter();
  const pathname = usePathname();
  const isValidating = useRef(false);

  useEffect(() => {
    const validateSession = async () => {
      // Evitar validaciones simultáneas
      if (isValidating.current) return;
      isValidating.current = true;

      try {
        const supabase = createClient<Database>();

        // Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          isValidating.current = false;
          return;
        }

        // Obtener el session_id almacenado en el perfil
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("current_session_id, role")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          console.error("Error obteniendo perfil:", error);
          isValidating.current = false;
          return;
        }

        // Validar sesión única para admins y colaboradores
        if (profile.role !== "admin" && profile.role !== "colaborador") {
          isValidating.current = false;
          return;
        }

        // Comparar session_id
        const currentSessionId = session.access_token.slice(-32);

        console.log("Validando sesión:", {
          stored: profile.current_session_id,
          current: currentSessionId,
          match: profile.current_session_id === currentSessionId
        });

        if (profile.current_session_id && profile.current_session_id !== currentSessionId) {
          // Sesión inválida - alguien más inició sesión
          console.log("Sesión invalidada: se inició sesión en otro dispositivo");

          // Cerrar sesión
          await supabase.auth.signOut();

          // Redirigir a login con mensaje
          router.push("/login?error=session_expired");
          return;
        }
      } catch (err) {
        console.error("Error validando sesión:", err);
      } finally {
        isValidating.current = false;
      }
    };

    // Validar inmediatamente
    validateSession();

    // Validar cada 5 segundos (más agresivo)
    const interval = setInterval(validateSession, 5000);

    return () => clearInterval(interval);
  }, [router, pathname]); // Re-validar cuando cambia la ruta

  return null;
}
