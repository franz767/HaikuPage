"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectKeys } from "@/hooks/use-projects";
import { profileKeys } from "@/hooks/use-profile";

/**
 * Componente que precarga datos críticos en background
 * para acelerar la navegación entre páginas
 */
export function PrefetchData() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    useEffect(() => {
        // Prefetch proyectos si no están en cache
        queryClient.prefetchQuery({
            queryKey: projectKeys.lists(),
            queryFn: async () => {
                const { data } = await supabase
                    .from("projects")
                    .select("*")
                    .order("created_at", { ascending: false });
                return data ?? [];
            },
            staleTime: 5 * 60 * 1000,
        });

        // Prefetch perfil del usuario actual
        queryClient.prefetchQuery({
            queryKey: profileKeys.current(),
            queryFn: async () => {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) return null;

                const { data } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                return data ? { ...data, email: user.email } : null;
            },
            staleTime: Infinity,
        });
    }, [queryClient, supabase]);

    return null;
}
