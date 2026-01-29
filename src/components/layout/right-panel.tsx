"use client";

import { Bell, Calendar, TrendingUp, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/types/profile";

interface RightPanelProps {
    user: {
        full_name: string;
        avatar_url: string | null;
        role: "admin" | "user";
    };
}

export function RightPanel({ user }: RightPanelProps) {
    const today = new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <aside className="fixed right-0 top-0 z-40 h-screen w-72 border-l bg-card flex flex-col">
            {/* Header del panel */}
            <div className="flex h-16 items-center justify-between border-b px-5">
                <span className="text-sm font-medium text-muted-foreground">Información</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                </Button>
            </div>

            {/* Perfil del usuario */}
            <div className="p-5 border-b">
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                            {getInitials(user.full_name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.full_name}</p>
                        <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className="text-xs mt-1"
                        >
                            {user.role === "admin" ? "Administrador" : "Colaborador"}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Fecha actual */}
            <div className="p-5 border-b">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm capitalize">{today}</span>
                </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="p-5 space-y-4 flex-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resumen rápido
                </h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">Proyectos activos</span>
                        </div>
                        <span className="text-lg font-bold">--</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-sm font-medium">Pendientes</span>
                        </div>
                        <span className="text-lg font-bold">--</span>
                    </div>
                </div>
            </div>

            {/* Footer con versión */}
            <div className="p-5 border-t">
                <p className="text-xs text-muted-foreground text-center">
                    Haiku v0.1.0
                </p>
            </div>
        </aside>
    );
}
