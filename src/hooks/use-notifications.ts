"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationInsert } from "@/types/notification";

// ==============================================
// Query Keys
// ==============================================

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

// ==============================================
// Fetchers
// ==============================================

async function fetchNotifications(): Promise<Notification[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Si la tabla no existe aun, retornar array vacio
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []) as Notification[];
}

async function fetchUnreadCount(): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) {
    // Si la tabla no existe aun, retornar 0
    if (error.code === "42P01") {
      return 0;
    }
    throw new Error(error.message);
  }

  return count ?? 0;
}

// ==============================================
// Hooks de Consulta
// ==============================================

/**
 * Hook para obtener las notificaciones del usuario actual
 * Incluye polling automatico cada 30 segundos
 */
export function useNotifications(enabled: boolean = true) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    enabled,
    staleTime: 15000, // 15 segundos
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para obtener el contador de notificaciones no leidas
 * Polling mas frecuente para mantener el badge actualizado
 */
export function useUnreadNotificationsCount(enabled: boolean = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    enabled,
    staleTime: 10000, // 10 segundos
    refetchInterval: 15000, // Refrescar cada 15 segundos
  });
}

// ==============================================
// Hooks de Mutacion
// ==============================================

/**
 * Hook para marcar una notificacion como leida
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("notifications")
        .update({
          read: true,
          read_at: new Date().toISOString(),
        } as never)
        .eq("id", notificationId);

      if (error) throw new Error(error.message);
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook para marcar todas las notificaciones como leidas
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabase
        .from("notifications")
        .update({
          read: true,
          read_at: new Date().toISOString(),
        } as never)
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook para crear una notificacion
 * Se usa internamente para enviar notificaciones a usuarios
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: NotificationInsert) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Notification;
    },
    onSuccess: () => {
      // No invalidamos aqui porque las notificaciones son para otros usuarios
      // El polling se encargara de actualizar
    },
  });
}

/**
 * Hook para crear multiples notificaciones (para notificar a varios admins)
 */
export function useCreateNotifications() {
  return useMutation({
    mutationFn: async (notifications: NotificationInsert[]) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("notifications")
        .insert(
          notifications.map((n) => ({
            user_id: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data || {},
          })) as never[]
        )
        .select();

      if (error) throw new Error(error.message);
      return data as Notification[];
    },
  });
}

/**
 * Hook para eliminar una notificacion
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw new Error(error.message);
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
