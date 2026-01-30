"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Checklist, ChecklistItem, TaskAttachment, TaskComment, TaskActivity } from "@/types/task";

// =============================================
// Query Keys
// =============================================
export const checklistKeys = {
    all: ["checklists"] as const,
    byTask: (taskId: string) => [...checklistKeys.all, "task", taskId] as const,
};

export const attachmentKeys = {
    all: ["attachments"] as const,
    byTask: (taskId: string) => [...attachmentKeys.all, "task", taskId] as const,
};

export const commentKeys = {
    all: ["comments"] as const,
    byTask: (taskId: string) => [...commentKeys.all, "task", taskId] as const,
};

export const activityKeys = {
    all: ["activities"] as const,
    byTask: (taskId: string) => [...activityKeys.all, "task", taskId] as const,
};

// =============================================
// Checklist Queries & Mutations
// =============================================

export function useChecklists(taskId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: checklistKeys.byTask(taskId),
        queryFn: async () => {
            const supabase = createClient();

            // Get checklists with their items
            const { data: checklists, error } = await supabase
                .from("task_checklists" as any)
                .select("*")
                .eq("task_id", taskId)
                .order("position", { ascending: true });

            if (error) throw error;

            // Get items for each checklist
            const checklistsWithItems = await Promise.all(
                ((checklists || []) as Checklist[]).map(async (checklist) => {
                    const { data: items } = await supabase
                        .from("task_checklist_items" as any)
                        .select("*")
                        .eq("checklist_id", checklist.id)
                        .order("position", { ascending: true });

                    return { ...checklist, items: (items || []) as ChecklistItem[] };
                })
            );

            return checklistsWithItems as Checklist[];
        },
        enabled: !!taskId && enabled,
        staleTime: 30000, // 30 segundos antes de considerar datos obsoletos
        gcTime: 300000, // 5 minutos en caché
    });
}

export function useCreateChecklist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, title = "Checklist" }: { taskId: string; title?: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("task_checklists" as any)
                .insert({ task_id: taskId, title } as any)
                .select()
                .single();

            if (error) throw error;
            return data as Checklist;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: checklistKeys.byTask(data.task_id),
            });
        },
    });
}

export function useDeleteChecklist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("task_checklists" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            return { id, taskId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: checklistKeys.byTask(data.taskId),
            });
        },
    });
}

export function useCreateChecklistItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ checklistId, taskId, title }: { checklistId: string; taskId: string; title: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("task_checklist_items" as any)
                .insert({ checklist_id: checklistId, title } as any)
                .select()
                .single();

            if (error) throw error;
            return { item: data as ChecklistItem, taskId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: checklistKeys.byTask(data.taskId),
            });
        },
    });
}

export function useToggleChecklistItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, taskId, isCompleted }: { id: string; taskId: string; isCompleted: boolean }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("task_checklist_items" as any)
                .update({ is_completed: isCompleted } as any)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return { item: data as ChecklistItem, taskId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: checklistKeys.byTask(data.taskId),
            });
        },
    });
}

export function useDeleteChecklistItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("task_checklist_items" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            return { id, taskId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: checklistKeys.byTask(data.taskId),
            });
        },
    });
}

// =============================================
// Attachment Queries & Mutations
// =============================================

export function useAttachments(taskId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: attachmentKeys.byTask(taskId),
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("task_attachments" as any)
                .select("*")
                .eq("task_id", taskId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data || []) as TaskAttachment[];
        },
        enabled: !!taskId && enabled,
        staleTime: 30000,
        gcTime: 300000,
    });
}

export function useUploadAttachment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
            const supabase = createClient();

            // Validar tamaño máximo de 10MB
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes
            if (file.size > MAX_FILE_SIZE) {
                throw new Error("El archivo excede el tamaño máximo de 10MB");
            }

            // Upload file to storage
            // Limpiar nombre de archivo de caracteres especiales
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${Date.now()}_${cleanFileName}`;
            const filePath = `${taskId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("attachments")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("attachments")
                .getPublicUrl(filePath);

            // Create attachment record
            const { data, error } = await supabase
                .from("task_attachments" as any)
                .insert({
                    task_id: taskId,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_type: file.type,
                    file_size: file.size,
                } as any)
                .select()
                .single();

            if (error) throw error;
            return data as TaskAttachment;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: attachmentKeys.byTask(data.task_id),
            });
        },
    });
}

export function useDeleteAttachment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, taskId, fileUrl }: { id: string; taskId: string; fileUrl: string }) => {
            const supabase = createClient();

            // Delete from storage (extract path from URL)
            const urlParts = fileUrl.split("/attachments/");
            if (urlParts[1]) {
                await supabase.storage.from("attachments").remove([urlParts[1]]);
            }

            // Delete record
            const { error } = await supabase
                .from("task_attachments" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            return { id, taskId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: attachmentKeys.byTask(data.taskId),
            });
        },
    });
}

// =============================================
// Comment Queries & Mutations
// =============================================

export function useComments(taskId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: commentKeys.byTask(taskId),
        queryFn: async () => {
            const supabase = createClient();
            try {
                const { data, error } = await supabase
                    .from("task_comments" as any)
                    .select(`
                        *,
                        user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
                    `)
                    .eq("task_id", taskId)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.warn("Error fetching comments:", error.message);
                    return [] as TaskComment[];
                }
                return (data || []) as TaskComment[];
            } catch (e) {
                console.warn("Comments table may not exist:", e);
                return [] as TaskComment[];
            }
        },
        enabled: !!taskId && enabled,
        staleTime: 30000,
        gcTime: 300000,
    });
}

export function useCreateComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            const { data, error } = await supabase
                .from("task_comments" as any)
                .insert({
                    task_id: taskId,
                    user_id: user.id,
                    content: content.trim(),
                } as any)
                .select(`
                    *,
                    user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
                `)
                .single();

            if (error) throw error;
            return data as TaskComment;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: commentKeys.byTask(data.task_id),
            });
            // Also invalidate activity
            queryClient.invalidateQueries({
                queryKey: activityKeys.byTask(data.task_id),
            });
        },
    });
}

export function useDeleteComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("task_comments" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            return { id, taskId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: commentKeys.byTask(data.taskId),
            });
        },
    });
}

export function useUpdateComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, taskId, content }: { id: string; taskId: string; content: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("task_comments" as any)
                .update({ content: content.trim() } as any)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return { ...data, taskId } as TaskComment & { taskId: string };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: commentKeys.byTask(data.taskId),
            });
        },
    });
}

// =============================================
// Activity Queries
// =============================================

export function useActivities(taskId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: activityKeys.byTask(taskId),
        queryFn: async () => {
            const supabase = createClient();
            try {
                const { data, error } = await supabase
                    .from("task_activities" as any)
                    .select(`
                        *,
                        user:profiles!task_activities_user_id_fkey(id, full_name, avatar_url)
                    `)
                    .eq("task_id", taskId)
                    .order("created_at", { ascending: false })
                    .limit(20);

                if (error) {
                    console.warn("Error fetching activities:", error.message);
                    return [] as TaskActivity[];
                }
                return (data || []) as TaskActivity[];
            } catch (e) {
                console.warn("Activities table may not exist:", e);
                return [] as TaskActivity[];
            }
        },
        enabled: !!taskId && enabled,
        staleTime: 60000, // 1 minuto
        gcTime: 300000,
    });
}

export function useCreateActivity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            taskId,
            activityType,
            metadata,
        }: {
            taskId: string;
            activityType: string;
            metadata?: Record<string, any>;
        }) => {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            const { data, error } = await supabase
                .from("task_activities" as any)
                .insert({
                    task_id: taskId,
                    user_id: user.id,
                    activity_type: activityType,
                    metadata: metadata || null,
                } as any)
                .select()
                .single();

            if (error) throw error;
            return data as TaskActivity;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: activityKeys.byTask(data.task_id),
            });
        },
    });
}
