"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  ProjectWithRelations,
  ProjectMetadata,
  ProjectStatus,
} from "@/types/project";

// ==============================================
// Query Keys centralizadas
// ==============================================

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// ==============================================
// Fetchers
// ==============================================

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  client_id: string | null;
  metadata: Record<string, unknown> | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

async function fetchProjects(clientId?: string | null): Promise<ProjectWithRelations[]> {
  const supabase = createClient();

  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  // Si se proporciona clientId, filtrar solo proyectos de ese cliente
  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching projects:", error);
    throw new Error(error.message);
  }

  const projects = data as ProjectRow[] | null;

  return (projects ?? []).map((project) => ({
    ...project,
    metadata: (project.metadata ?? {}) as ProjectMetadata,
    client: null,
    members: [],
  }));
}

async function fetchProject(id: string): Promise<ProjectWithRelations> {
  const supabase = createClient();

  // Obtener proyecto con cliente
  const { data, error } = (await supabase
    .from("projects")
    .select(`
      *,
      client:clients(id, name, company, email)
    `)
    .eq("id", id)
    .single()) as { data: ProjectRow & { client: { id: string; name: string; company: string | null; email: string } | null } | null; error: { message: string } | null };

  if (error) {
    console.error("Error fetching project:", error);
    throw new Error(error.message);
  }

  return {
    ...data,
    metadata: ((data?.metadata ?? {}) as ProjectMetadata),
    client: data?.client || null,
    members: [],
  } as ProjectWithRelations;
}

// ==============================================
// Hooks
// ==============================================

/**
 * Hook para obtener todos los proyectos (RLS aplica automaticamente)
 * @param clientId - Si se proporciona, filtra solo proyectos de ese cliente
 */
export function useProjects(clientId?: string | null) {
  return useQuery({
    queryKey: clientId ? projectKeys.list({ clientId }) : projectKeys.lists(),
    queryFn: () => fetchProjects(clientId),
    // Optimización: Mantener lista de proyectos en cache para navegación rápida
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un proyecto por ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

/**
 * Hook para crear un proyecto
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      status?: ProjectStatus;
      deadline?: string;
      client_id?: string;
      budget?: number;
      metadata?: ProjectMetadata;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: input.name,
          description: input.description ?? null,
          status: input.status ?? "draft",
          deadline: input.deadline ?? null,
          client_id: input.client_id ?? null,
          budget: input.budget ?? null,
          metadata: input.metadata ?? {},
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Hook para actualizar un proyecto
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string;
      status?: ProjectStatus;
      deadline?: string | null;
      client_id?: string | null;
      budget?: number | null;
      metadata?: ProjectMetadata;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as ProjectRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) });
    },
  });
}

/**
 * Hook para eliminar un proyecto (solo admin)
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}