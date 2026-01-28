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

async function fetchProjects(): Promise<ProjectWithRelations[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      client:clients(id, name, company),
      members:project_members(
        profile:profiles(id, full_name, avatar_url)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Transformar la estructura de members
  return (data ?? []).map((project) => ({
    ...project,
    metadata: (project.metadata ?? {}) as ProjectMetadata,
    members:
      project.members
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((m: any) => m.profile)
        .filter(Boolean) ?? [],
  }));
}

async function fetchProject(id: string): Promise<ProjectWithRelations> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      client:clients(id, name, company, email),
      members:project_members(
        profile:profiles(id, full_name, avatar_url)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    metadata: (data.metadata ?? {}) as ProjectMetadata,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: data.members?.map((m: any) => m.profile).filter(Boolean) ?? [],
  };
}

// ==============================================
// Hooks
// ==============================================

/**
 * Hook para obtener todos los proyectos (RLS aplica automaticamente)
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: fetchProjects,
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
          description: input.description,
          status: input.status ?? "draft",
          deadline: input.deadline,
          client_id: input.client_id,
          budget: input.budget,
          metadata: input.metadata ?? {},
        })
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
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
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
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
