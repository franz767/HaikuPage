"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientWithProjects } from "@/types/client";

// ==============================================
// Query Keys
// ==============================================

export const clientKeys = {
  all: ["clients"] as const,
  lists: () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, id] as const,
};

// ==============================================
// Hooks
// ==============================================

/**
 * Hook para obtener todos los clientes (RLS aplica automaticamente)
 */
export function useClients() {
  const supabase = createClient();

  return useQuery({
    queryKey: clientKeys.lists(),
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    },
  });
}

/**
 * Hook para obtener un cliente con sus proyectos
 */
export function useClient(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async (): Promise<ClientWithProjects> => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          projects:projects(id, name, status)
        `
        )
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
 * Hook para crear un cliente (solo admin)
 */
export function useCreateClient() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      company?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(input)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}

/**
 * Hook para actualizar un cliente (solo admin)
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      company?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) });
    },
  });
}

/**
 * Hook para eliminar un cliente (solo admin)
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}
