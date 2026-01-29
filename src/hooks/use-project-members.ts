"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectKeys } from "./use-projects";

// ==============================================
// Types
// ==============================================

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: "admin" | "user";
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "admin" | "user";
}

// ==============================================
// Query Keys
// ==============================================

export const memberKeys = {
  all: ["project-members"] as const,
  byProject: (projectId: string) => [...memberKeys.all, projectId] as const,
  users: ["users"] as const,
};

// ==============================================
// Hooks
// ==============================================

/**
 * Hook para obtener los miembros de un proyecto
 */
export function useProjectMembers(projectId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: memberKeys.byProject(projectId),
    queryFn: async (): Promise<ProjectMember[]> => {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          id,
          project_id,
          user_id,
          assigned_at,
          profile:profiles!user_id(id, full_name, avatar_url, role)
        `)
        .eq("project_id", projectId)
        .order("assigned_at", { ascending: true });

      if (error) {
        console.error("Error fetching project members:", error);
        throw new Error(error.message);
      }

      return (data ?? []).map((item: any) => ({
        id: item.id,
        project_id: item.project_id,
        user_id: item.user_id,
        assigned_at: item.assigned_at,
        profile: item.profile,
      }));
    },
    enabled: !!projectId,
  });
}

/**
 * Hook para obtener todos los usuarios (para asignar a proyectos)
 */
export function useAllUsers() {
  const supabase = createClient();

  return useQuery({
    queryKey: memberKeys.users,
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error fetching users:", error);
        throw new Error(error.message);
      }

      return (data as UserProfile[]) ?? [];
    },
  });
}

/**
 * Hook para agregar un miembro a un proyecto
 */
export function useAddProjectMember() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: userId,
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.byProject(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Hook para quitar un miembro de un proyecto
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      projectId,
    }: {
      memberId: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);

      if (error) throw new Error(error.message);
      return memberId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.byProject(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}