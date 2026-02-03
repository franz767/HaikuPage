"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { useUserRole } from "@/hooks/use-user-role";

export default function ProjectsPage() {
  const { profile, isAdmin, isClient, isLoading: isLoadingProfile } = useUserRole();

  // Si es cliente, filtrar solo sus proyectos
  const clientIdFilter = isClient ? profile?.client_id : undefined;

  // Solo buscar proyectos cuando ya tenemos el perfil cargado para saber si filtrar
  const { data: projects, isLoading: isLoadingProjects, error } = useProjects(clientIdFilter);

  const isLoading = isLoadingProfile || isLoadingProjects;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isClient ? "Mis Proyectos" : "Proyectos"}
          </h1>
          <p className="text-muted-foreground">
            {isClient
              ? "Ve el progreso de tus proyectos"
              : "Gestiona todos tus proyectos"}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Link>
          </Button>
        )}
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Error al cargar proyectos</p>
        </div>
      ) : projects?.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No hay proyectos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Crea tu primer proyecto para comenzar"
              : isClient
                ? "No tienes proyectos activos en este momento"
                : "No tienes proyectos asignados"}
          </p>
          {isAdmin && (
            <Button className="mt-4" asChild>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Crear proyecto
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
