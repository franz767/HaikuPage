"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskInsert, TaskUpdate } from "@/types/task";

// =============================================
// Query Keys
// =============================================
export const taskKeys = {
    all: ["tasks"] as const,
    byProject: (projectId: string) => [...taskKeys.all, "project", projectId] as const,
};

// =============================================
// Queries
// =============================================

export function useTasks(projectId: string) {
    return useQuery({
        queryKey: taskKeys.byProject(projectId),
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("project_tasks" as any)
                .select("*")
                .eq("project_id", projectId)
                .order("position", { ascending: true });

            if (error) throw error;
            return (data || []) as Task[];
        },
        enabled: !!projectId,
    });
}

// =============================================
// Mutations
// =============================================

export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: TaskInsert) => {
            const supabase = createClient();

            // Obtener la posición máxima actual para esta columna
            const { data: existingTasks } = await supabase
                .from("project_tasks" as any)
                .select("position")
                .eq("project_id", task.project_id)
                .eq("status", task.status || "inicio")
                .order("position", { ascending: false })
                .limit(1);

            const maxPosition = (existingTasks as any)?.[0]?.position ?? -1;

            const { data, error } = await supabase
                .from("project_tasks" as any)
                .insert({ ...task, position: maxPosition + 1 } as any)
                .select()
                .single();

            if (error) throw error;
            return data as Task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: taskKeys.byProject(data.project_id),
            });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("project_tasks" as any)
                .update(updates as any)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: taskKeys.byProject(data.project_id),
            });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("project_tasks" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            return { id, projectId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: taskKeys.byProject(data.projectId),
            });
        },
    });
}

// Mover tarea a otra columna
export function useMoveTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            taskId,
            projectId,
            newStatus,
            newPosition,
        }: {
            taskId: string;
            projectId: string;
            newStatus: string;
            newPosition: number;
        }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("project_tasks" as any)
                .update({ status: newStatus, position: newPosition } as any)
                .eq("id", taskId)
                .select()
                .single();

            if (error) throw error;
            return data as Task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: taskKeys.byProject(data.project_id),
            });
        },
    });
}
