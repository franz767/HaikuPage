"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileWithAuth } from "@/types/profile";

// ==============================================
// Query Keys
// ==============================================

export const profileKeys = {
  all: ["profiles"] as const,
  current: () => [...profileKeys.all, "current"] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
};

// ==============================================
// Hooks
// ==============================================

/**
 * Hook para obtener el perfil del usuario actual
 */
export function useCurrentProfile() {
  const supabase = createClient();

  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: async (): Promise<ProfileWithAuth | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

      if (error) {
        throw new Error(error.message);
      }

      return {
        ...data,
        email: user.email,
      } as ProfileWithAuth;
    },
    // Optimización: El perfil raramente cambia, mantenerlo en cache más tiempo
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Hook para obtener un perfil por ID
 */
export function useProfile(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook para actualizar el perfil del usuario actual
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (updates: { full_name?: string; avatar_url?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No autenticado");

      const { data, error } = (await (supabase
        .from("profiles") as any)
        .update(updates)
        .eq("id", user.id)
        .select()
        .single()) as { data: Profile | null; error: { message: string } | null };

      if (error) throw new Error(error.message);
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });
}
