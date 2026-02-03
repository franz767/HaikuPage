"use client";

import { useState } from "react";
import { Loader2, User, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { data: profile, isLoading } = useCurrentProfile();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) return;

    try {
      await updateProfile.mutateAsync({ full_name: fullName });
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Error al guardar: " + (err as Error).message);
    }
  };

  const startEditing = () => {
    setFullName(profile?.full_name || "");
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[150px]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Success message */}
      {saved && (
        <div className="p-3 text-sm text-emerald-600 bg-emerald-50 rounded-md">
          Cambios guardados correctamente
        </div>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Tu informacion personal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {profile?.full_name?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    className="max-w-[250px]"
                  />
                  <Button onClick={handleSave} disabled={updateProfile.isPending}>
                    {updateProfile.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-lg">{profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Miembro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long" }) : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    Editar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rol y Permisos
          </CardTitle>
          <CardDescription>
            Tu nivel de acceso en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rol actual</p>
              <p className="text-sm text-muted-foreground">
                {profile?.role === "admin"
                  ? "Acceso completo a todas las funciones"
                  : profile?.role === "cliente"
                  ? "Acceso de solo lectura a tus proyectos"
                  : "Acceso limitado a proyectos asignados"}
              </p>
            </div>
            <Badge variant={profile?.role === "admin" ? "default" : "secondary"}>
              {profile?.role === "admin"
                ? "Administrador"
                : profile?.role === "cliente"
                ? "Cliente"
                : "Colaborador"}
            </Badge>
          </div>

          {profile?.role === "cliente" && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Permisos de cliente:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Ver el progreso de tus proyectos</li>
                <li>• Ver las tareas y su estado</li>
                <li>• Consultar información de pagos</li>
              </ul>
            </div>
          )}

          {profile?.role === "admin" && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Permisos de administrador:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Ver y gestionar todos los proyectos</li>
                <li>• Acceso completo a finanzas</li>
                <li>• Gestionar clientes</li>
                <li>• Asignar usuarios a proyectos</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications Card (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
          </CardTitle>
          <CardDescription>
            Configura como recibir alertas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Proximamente: Configura notificaciones por email y push.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}