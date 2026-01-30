"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/notification";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: notifications = [], isLoading } = useNotifications(isOpen);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "payment_submitted":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "payment_pending_review":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "payment_approved":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "payment_rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leida si no lo esta
    if (!notification.read) {
      await markRead.mutateAsync(notification.id);
    }

    // Navegar segun el tipo de notificacion
    if (notification.data.project_id) {
      router.push(`/projects/${notification.data.project_id}`);
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Boton de campanita */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notificaciones</span>
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  {/* Icono */}
                  <div
                    className={cn(
                      "shrink-0 mt-0.5 p-1.5 rounded-full",
                      !notification.read ? "bg-muted" : "bg-transparent"
                    )}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-tight",
                        !notification.read && "font-medium"
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Indicador de no leida */}
                  {!notification.read && (
                    <div className="shrink-0 mt-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
