"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Trash2,
  Edit,
  Loader2,
  UserPlus,
  X,
  Users,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProject, useDeleteProject, useUpdateProject } from "@/hooks/use-projects";
import {
  useProjectMembers,
  useAllUsers,
  useAddProjectMember,
  useRemoveProjectMember,
} from "@/hooks/use-project-members";
import { useCurrentProfile } from "@/hooks/use-profile";
import { PROJECT_STATUS, type ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const { data: project, isLoading, error } = useProject(id);
  const { data: members, isLoading: membersLoading } = useProjectMembers(id);
  const { data: allUsers } = useAllUsers();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();

  const [showAddMember, setShowAddMember] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);

  const isAdmin = profile?.role === "admin";

  // Verificar si el usuario actual es miembro del proyecto
  const isMember = members?.some((m) => m.user_id === profile?.id);

  const handleDelete = async () => {
    if (!confirm("¿Estas seguro de eliminar este proyecto?")) return;

    try {
      await deleteProject.mutateAsync(id);
      router.push("/projects");
    } catch (err) {
      alert("Error al eliminar: " + (err as Error).message);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addMember.mutateAsync({ projectId: id, userId });
      setShowAddMember(false);
    } catch (err) {
      alert("Error al agregar miembro: " + (err as Error).message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("¿Quitar este miembro del proyecto?")) return;
    try {
      await removeMember.mutateAsync({ memberId, projectId: id });
    } catch (err) {
      alert("Error al quitar miembro: " + (err as Error).message);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      await updateProject.mutateAsync({ id, status: newStatus });
      setShowStatusSelector(false);
    } catch (err) {
      alert("Error al cambiar estado: " + (err as Error).message);
    }
  };

  // Usuarios que no están en el proyecto
  const availableUsers = allUsers?.filter(
    (user) => !members?.some((m) => m.user_id === user.id)
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Proyecto no encontrado</h1>
        </div>
        <p className="text-muted-foreground">
          {error?.message || "El proyecto no existe o no tienes acceso."}
        </p>
      </div>
    );
  }

  const statusConfig = PROJECT_STATUS[project.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {project.name}
              </h1>
              {/* Badge de estado - clickeable para miembros */}
              <div className="relative">
                <button
                  onClick={() => isMember && setShowStatusSelector(!showStatusSelector)}
                  disabled={!isMember || updateProject.isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                    isMember && "cursor-pointer hover:opacity-80",
                    !isMember && "cursor-default",
                    statusConfig.color === "default" &&
                    "bg-primary/10 text-primary border-primary/20",
                    statusConfig.color === "secondary" &&
                    "bg-secondary border-secondary",
                    statusConfig.color === "success" &&
                    "bg-emerald-100 text-emerald-800 border-emerald-200",
                    statusConfig.color === "warning" &&
                    "bg-amber-100 text-amber-800 border-amber-200",
                    statusConfig.color === "destructive" &&
                    "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {updateProject.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  {statusConfig.label}
                  {isMember && <ChevronDown className="h-3 w-3" />}
                </button>
                {showStatusSelector && (
                  <div className="absolute left-0 top-full mt-2 w-48 bg-background border rounded-md shadow-lg z-10 py-1">
                    {Object.entries(PROJECT_STATUS).map(([key, value]) => (
                      <button
                        key={key}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                          project.status === key && "bg-muted/50 font-medium"
                        )}
                        onClick={() => handleStatusChange(key as ProjectStatus)}
                      >
                        <span className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          project.status === key
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {project.status === key && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </span>
                        {value.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Botón editar solo para admin */}
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link href={`/projects/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha limite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {project.deadline
                ? new Date(project.deadline).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
                : "Sin fecha"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {project.budget
                ? new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: "EUR",
                }).format(Number(project.budget))
                : "Sin definir"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {project.client?.name || "Sin cliente"}
            </p>
            {project.client?.company && (
              <p className="text-sm text-muted-foreground">
                {project.client.company}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros del equipo
          </CardTitle>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMember(!showAddMember)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Anadir
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Add member dropdown */}
          {showAddMember && availableUsers && availableUsers.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Selecciona un usuario:</p>
              <div className="flex flex-wrap gap-2">
                {availableUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddMember(user.id)}
                    disabled={addMember.isPending}
                  >
                    {addMember.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {user.full_name}
                    {user.role === "admin" && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        Admin
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {showAddMember && (!availableUsers || availableUsers.length === 0) && (
            <div className="mb-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
              Todos los usuarios ya estan asignados a este proyecto.
            </div>
          )}

          {/* Members list */}
          {membersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {member.profile.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Asignado{" "}
                        {new Date(member.assigned_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        member.profile.role === "admin" ? "default" : "secondary"
                      }
                    >
                      {member.profile.role === "admin" ? "Admin" : "Colaborador"}
                    </Badge>
                    {isAdmin && member.profile.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMember.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay miembros asignados a este proyecto.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      {project.metadata && Object.keys(project.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuracion</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(project.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}