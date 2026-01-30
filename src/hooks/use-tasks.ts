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
        staleTime: 10000, // 10 segundos
        gcTime: 300000, // 5 minutos
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
        // Actualización optimista
        onMutate: async ({ id, ...updates }) => {
            // Buscar en qué proyecto está la tarea
            const allQueries = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.all });

            for (const [queryKey, tasks] of allQueries) {
                if (!tasks) continue;
                const taskIndex = tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                    const projectId = tasks[taskIndex].project_id;
                    await queryClient.cancelQueries({ queryKey: taskKeys.byProject(projectId) });

                    const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.byProject(projectId));

                    queryClient.setQueryData<Task[]>(taskKeys.byProject(projectId), (old) => {
                        if (!old) return old;
                        return old.map(task =>
                            task.id === id ? { ...task, ...updates } : task
                        );
                    });

                    return { previousTasks, projectId };
                }
            }
        },
        onError: (err, variables, context) => {
            if (context?.previousTasks && context?.projectId) {
                queryClient.setQueryData(
                    taskKeys.byProject(context.projectId),
                    context.previousTasks
                );
            }
        },
        onSettled: (data) => {
            if (data) {
                setTimeout(() => {
                    queryClient.invalidateQueries({
                        queryKey: taskKeys.byProject(data.project_id),
                    });
                }, 300);
            }
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

// =============================================
// Tipos para el RPC de batch update
// =============================================
interface TaskOrderPayload {
    id: string;
    position: number;
    status?: string;
}

interface BatchUpdateResult {
    success: boolean;
    updated_count: number;
    error?: string;
}

// Mover tarea a otra columna o reordenar dentro de la misma
// Optimizado con RPC batch update + Optimistic UI
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

            // Obtener todas las tareas del proyecto desde el cache
            const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.byProject(projectId));

            if (!cachedTasks) {
                throw new Error("No se encontraron tareas en cache");
            }

            const taskToMove = cachedTasks.find(t => t.id === taskId);
            if (!taskToMove) {
                throw new Error("Tarea no encontrada");
            }

            const oldStatus = taskToMove.status;
            const oldPosition = taskToMove.position ?? 0;

            // Construir el payload de cambios basado en la lógica Optimistic
            const payload: TaskOrderPayload[] = [];

            // Añadir la tarea movida
            payload.push({
                id: taskId,
                position: newPosition,
                status: newStatus,
            });

            // Calcular cambios en otras tareas
            if (oldStatus === newStatus) {
                // Misma columna: ajustar posiciones intermedias
                if (oldPosition < newPosition) {
                    // Moviendo hacia ABAJO
                    cachedTasks
                        .filter(t =>
                            t.status === newStatus &&
                            t.id !== taskId &&
                            (t.position ?? 0) > oldPosition &&
                            (t.position ?? 0) <= newPosition
                        )
                        .forEach(t => {
                            payload.push({
                                id: t.id,
                                position: (t.position ?? 0) - 1,
                            });
                        });
                } else if (oldPosition > newPosition) {
                    // Moviendo hacia ARRIBA
                    cachedTasks
                        .filter(t =>
                            t.status === newStatus &&
                            t.id !== taskId &&
                            (t.position ?? 0) >= newPosition &&
                            (t.position ?? 0) < oldPosition
                        )
                        .forEach(t => {
                            payload.push({
                                id: t.id,
                                position: (t.position ?? 0) + 1,
                            });
                        });
                }
            } else {
                // Diferente columna: empujar tareas en la columna destino
                cachedTasks
                    .filter(t =>
                        t.status === newStatus &&
                        (t.position ?? 0) >= newPosition
                    )
                    .forEach(t => {
                        payload.push({
                            id: t.id,
                            position: (t.position ?? 0) + 1,
                        });
                    });
            }

            // Si no hay cambios reales, no hacer nada
            if (payload.length === 0) {
                return { projectId };
            }

            // ============================================
            // LLAMADA RPC ÚNICA (Batch Update)
            // ============================================
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc('update_task_order', {
                payload: payload,
            });

            if (error) {
                console.error("Error en batch update:", error);
                throw error;
            }

            const result = data as BatchUpdateResult;

            if (!result.success) {
                throw new Error(result.error || "Error desconocido en batch update");
            }

            return { projectId, updatedCount: result.updated_count };
        },
        // ============================================
        // OPTIMISTIC UI - Actualización instantánea
        // ============================================
        onMutate: async ({ taskId, projectId, newStatus, newPosition }) => {
            // Cancelar queries en progreso para evitar sobrescribir
            await queryClient.cancelQueries({ queryKey: taskKeys.byProject(projectId) });

            // Guardar estado anterior para rollback
            const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.byProject(projectId));

            // Actualizar caché INMEDIATAMENTE (sin esperar API)
            queryClient.setQueryData<Task[]>(taskKeys.byProject(projectId), (old) => {
                if (!old) return old;

                const taskToMove = old.find(t => t.id === taskId);
                if (!taskToMove) return old;

                const oldStatus = taskToMove.status;
                const oldPosition = taskToMove.position ?? 0;

                // Crear nueva lista con posiciones actualizadas
                return old.map(task => {
                    if (task.id === taskId) {
                        // La tarea que movemos
                        return { ...task, status: newStatus as any, position: newPosition };
                    }

                    if (oldStatus === newStatus && task.status === newStatus) {
                        // Misma columna: ajustar posiciones
                        const currentPos = task.position ?? 0;

                        if (oldPosition < newPosition && currentPos > oldPosition && currentPos <= newPosition) {
                            return { ...task, position: currentPos - 1 };
                        }
                        if (oldPosition > newPosition && currentPos >= newPosition && currentPos < oldPosition) {
                            return { ...task, position: currentPos + 1 };
                        }
                    } else if (oldStatus !== newStatus && task.status === newStatus) {
                        // Diferente columna: empujar tareas hacia abajo
                        const currentPos = task.position ?? 0;
                        if (currentPos >= newPosition) {
                            return { ...task, position: currentPos + 1 };
                        }
                    }

                    return task;
                });
            });

            return { previousTasks, projectId };
        },
        // ============================================
        // ROLLBACK - Restaurar estado anterior si falla
        // ============================================
        onError: (err, variables, context) => {
            console.error("Error moviendo tarea, ejecutando rollback:", err);

            if (context?.previousTasks) {
                queryClient.setQueryData(
                    taskKeys.byProject(context.projectId),
                    context.previousTasks
                );
            }
        },
        // ============================================
        // POST-SETTLED - No refetch inmediato
        // ============================================
        onSettled: (data, error, variables) => {
            // Solo revalidar en caso de error para sincronizar
            // En caso exitoso, confiamos en el estado local (evita flicker)
            if (error) {
                queryClient.invalidateQueries({
                    queryKey: taskKeys.byProject(variables.projectId),
                });
            }
        },
    });
}
