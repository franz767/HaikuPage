"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ==============================================
// Types
// ==============================================

interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ==============================================
// Query Keys
// ==============================================

export const clientKeys = {
  all: ["clients"] as const,
  lists: () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
};

// ==============================================
// Hooks
// ==============================================

/**
 * Hook para obtener todos los clientes
 */
export function useClients() {
  const supabase = createClient();

  return useQuery({
    queryKey: clientKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients:", error);
        throw new Error(error.message);
      }

      return (data as ClientRow[]) ?? [];
    },
  });
}

/**
 * Hook para obtener un cliente por ID
 */
export function useClient(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as ClientRow;
    },
    enabled: !!id,
  });
}

/**
 * Hook para crear un cliente
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
        .insert({
          name: input.name,
          company: input.company ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as ClientRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      await queryClient.refetchQueries({ queryKey: clientKeys.lists() });
    },
  });
}

/**
 * Hook para actualizar un cliente
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
      company?: string | null;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as ClientRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) });
    },
  });
}

/**
 * Hook para eliminar un cliente
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}