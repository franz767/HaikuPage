"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { getInitials } from "@/types/profile";

interface HeaderProps {
  user: {
    full_name: string;
    avatar_url: string | null;
    role: "admin" | "user";
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - espacio para breadcrumbs o búsqueda futura */}
      <div className="flex-1 px-6">
        {/* Placeholder */}
      </div>

      {/* Centro - espacio vacío expandible */}
      <div className="flex-1" />

      {/* Derecha - Panel de información del usuario */}
      <div className="flex items-center gap-3 border-l bg-muted/30 px-5 h-full">
        {/* Notificaciones */}
        <NotificationDropdown />

        {/* Separador visual */}
        <div className="h-6 w-px bg-border" />

        {/* Info del usuario */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{user.full_name}</p>
            <Badge
              variant={user.role === "admin" ? "default" : "secondary"}
              className="text-[10px] mt-0.5"
            >
              {user.role === "admin" ? "Admin" : "Colaborador"}
            </Badge>
          </div>
          <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
