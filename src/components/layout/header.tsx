"use client";

import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - breadcrumbs or search could go here */}
      <div className="flex items-center gap-4">
        {/* Placeholder for future search */}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificaciones</span>
        </Button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{user.full_name}</p>
            <Badge
              variant={user.role === "admin" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {user.role === "admin" ? "Admin" : "Colaborador"}
            </Badge>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
