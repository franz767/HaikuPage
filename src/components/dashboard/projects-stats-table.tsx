"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  FolderOpen,
  ClipboardList,
  Code2,
  AlertOctagon,
  TestTube,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tipo para la vista SQL optimizada
interface ProjectStatsView {
  id: string;
  name: string;
  status: string;
  count_inicio: number;
  count_desarrollo: number;
  count_bloqueado: number;
  count_testing: number;
  count_entregado: number;
  total_tasks: number;
  completed_percentage: number;
}

type TaskStatus = "inicio" | "desarrollo" | "bloqueado" | "testing" | "entregado";

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  inicio: {
    label: "Inicio",
    icon: <ClipboardList className="h-4 w-4" />,
    color: "text-slate-600 bg-slate-100",
  },
  desarrollo: {
    label: "Desarrollo",
    icon: <Code2 className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-100",
  },
  bloqueado: {
    label: "Bloqueado",
    icon: <AlertOctagon className="h-4 w-4" />,
    color: "text-red-600 bg-red-100",
  },
  testing: {
    label: "Testing",
    icon: <TestTube className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-100",
  },
  entregado: {
    label: "Entregado",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-100",
  },
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  inicio: "bg-blue-100 text-blue-700",
  desarrollo: "bg-blue-600 text-white",
  "en progreso": "bg-amber-100 text-amber-700",
  bloqueado: "bg-red-100 text-red-700",
  testing: "bg-amber-100 text-amber-700",
  entregado: "bg-emerald-100 text-emerald-700",
  revision: "bg-purple-100 text-purple-700",
  completado: "bg-emerald-100 text-emerald-700",
};

export function ProjectsStatsTable() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  // Suscripción Realtime para mantener las estadísticas actualizadas al instante
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("project-stats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
        },
        () => {
          // Si algo cambia en las tareas, recargamos la vista de estadísticas
          queryClient.invalidateQueries({ queryKey: ["project-stats-view"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // CONSULTA OPTIMIZADA: Una sola petición a la vista SQL
  const { data: projectStats, isLoading, error } = useQuery({
    queryKey: ["project-stats-view", showAll],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("project_stats_view" as any)
        .select("*");

      if (showAll) {
        // Mostrar SOLO entregados
        query = query.eq("status", "entregado");
      } else {
        // Mostrar SOLO activos (excluyendo entregados y posibles bugs)
        query = query.in("status", ["inicio", "desarrollo", "bloqueado", "testing"]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching project stats view:", error);
        throw error;
      }
      return (data || []) as ProjectStatsView[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // No reintentar demasiado si la vista no existe
  });

  // Totales generales calculados en el cliente desde los datos de la vista
  const totals = useMemo(() => {
    const total: Record<TaskStatus, number> = {
      inicio: 0,
      desarrollo: 0,
      bloqueado: 0,
      testing: 0,
      entregado: 0,
    };
    let totalTasks = 0;

    projectStats?.forEach(p => {
      total.inicio += p.count_inicio;
      total.desarrollo += p.count_desarrollo;
      total.bloqueado += p.count_bloqueado;
      total.testing += p.count_testing;
      total.entregado += p.count_entregado;
      totalTasks += p.total_tasks;
    });

    const completedPercentage = totalTasks > 0
      ? Math.round((total.entregado / totalTasks) * 100)
      : 0;

    return { ...total, totalTasks, completedPercentage };
  }, [projectStats]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Estadisticas de Proyectos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Manejo de error específico si la vista no existe
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8 text-center text-red-600">
          <p className="font-semibold">Error cargando estadísticas</p>
          <p className="text-sm mt-1">Por favor ejecuta la migración SQL <code>00016_project_stats_view.sql</code> en Supabase.</p>
        </CardContent>
      </Card>
    );
  }

  if (!projectStats || projectStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Estadisticas de Proyectos
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-completed-empty"
                  checked={showAll}
                  onCheckedChange={(checked) => setShowAll(checked as boolean)}
                />
                <Label htmlFor="show-completed-empty" className="text-sm font-medium">
                  Ver entregados
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {showAll ? "No hay proyectos entregados" : "No hay proyectos activos"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Estadisticas de Proyectos
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-md border text-muted-foreground hover:text-foreground transition-colors">
              <Checkbox
                id="show-completed"
                checked={showAll}
                onCheckedChange={(checked) => setShowAll(checked as boolean)}
              />
              <Label htmlFor="show-completed" className="text-xs font-medium cursor-pointer">
                Ver entregados
              </Label>
            </div>
            <Badge variant="secondary" className="text-sm font-semibold">
              {projectStats.length} proyecto{projectStats.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => {
            const config = STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className={`p-3 rounded-lg ${config.color} flex flex-col items-center justify-center`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {config.icon}
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <span className="text-2xl font-bold">{totals[status]}</span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm font-semibold">{totals.completedPercentage}% completado</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${totals.completedPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{totals.entregado} tareas entregadas</span>
            <span>{totals.totalTasks} tareas totales</span>
          </div>
        </div>

        {/* Projects Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Proyecto</TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="flex flex-col items-center">
                    <ClipboardList className="h-4 w-4 text-slate-600" />
                    <span className="text-[10px] mt-0.5">Inicio</span>
                  </div>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="flex flex-col items-center">
                    <Code2 className="h-4 w-4 text-blue-600" />
                    <span className="text-[10px] mt-0.5">Desarrollo</span>
                  </div>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="flex flex-col items-center">
                    <AlertOctagon className="h-4 w-4 text-red-600" />
                    <span className="text-[10px] mt-0.5">Bloqueado</span>
                  </div>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="flex flex-col items-center">
                    <TestTube className="h-4 w-4 text-amber-600" />
                    <span className="text-[10px] mt-0.5">Testing</span>
                  </div>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] mt-0.5">Entregado</span>
                  </div>
                </TableHead>
                <TableHead className="text-center w-[100px]">Progreso</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectStats.map(project => (
                <TableRow key={project.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 mt-1 ${PROJECT_STATUS_COLORS[project.status] || "bg-gray-100 text-gray-700"}`}
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${project.count_inicio > 0 ? "bg-slate-100 text-slate-700" : "text-muted-foreground"}`}>
                      {project.count_inicio}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${project.count_desarrollo > 0 ? "bg-blue-100 text-blue-700" : "text-muted-foreground"}`}>
                      {project.count_desarrollo}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${project.count_bloqueado > 0 ? "bg-red-100 text-red-700" : "text-muted-foreground"}`}>
                      {project.count_bloqueado}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${project.count_testing > 0 ? "bg-amber-100 text-amber-700" : "text-muted-foreground"}`}>
                      {project.count_testing}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${project.count_entregado > 0 ? "bg-emerald-100 text-emerald-700" : "text-muted-foreground"}`}>
                      {project.count_entregado}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${project.completed_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.completed_percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/projects/${project.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell>
                  <span className="font-semibold">TOTAL</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-800 text-sm font-bold">
                    {totals.inicio}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-800 text-sm font-bold">
                    {totals.desarrollo}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-200 text-red-800 text-sm font-bold">
                    {totals.bloqueado}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800 text-sm font-bold">
                    {totals.testing}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 text-sm font-bold">
                    {totals.entregado}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-emerald-600">
                      {totals.completedPercentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
