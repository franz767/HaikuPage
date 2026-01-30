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
  ChevronLeft,
  ChevronRight,
  Check,
  PanelRightClose,
  PanelRightOpen,
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
import { KanbanBoard } from "@/components/kanban";
import { PaymentSubmissionModal } from "@/components/payments/PaymentSubmissionModal";
import { useProjectPayments } from "@/hooks/use-payment-submissions";
import { PROJECT_STATUS, type ProjectStatus, type PaymentInstallment } from "@/types/project";
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
  const { data: projectPayments = [] } = useProjectPayments(id);
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();

  const [showAddMember, setShowAddMember] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<PaymentInstallment | null>(null);

  const isAdmin = profile?.role === "admin";

  // Obtener IDs de admins para notificaciones de pago
  const adminUserIds = allUsers?.filter((u) => u.role === "admin").map((u) => u.id) || [];

  // Verificar si el usuario actual es miembro del proyecto
  const isMember = members?.some((m) => m.user_id === profile?.id);

  // Puede pagar: si es miembro O si es admin
  const canPay = isMember || isAdmin;

  // Helper para obtener el pago aprobado de una cuota
  const getApprovedPayment = (installmentNumber: number) => {
    return projectPayments.find(
      (p) => p.installment_number === installmentNumber && p.status === "approved"
    );
  };

  // Helper para obtener pago pendiente de una cuota
  const getPendingPayment = (installmentNumber: number) => {
    return projectPayments.find(
      (p) => p.installment_number === installmentNumber && p.status === "pending"
    );
  };

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
    <div className="flex gap-6">
      {/* Contenido principal - izquierda/centro */}
      <div className="flex-1 space-y-6 min-w-0">
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

        {/* Tablero Kanban */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Tablero de Tareas
          </h2>
          <KanbanBoard projectId={id} isAdmin={isAdmin} />
        </div>
      </div>

      {/* Panel lateral derecho - Información del proyecto (Colapsable) */}
      <div className="relative">
        {/* Botón toggle para abrir/cerrar el panel */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={cn(
            "absolute -left-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted transition-all duration-300",
            !isPanelOpen && "-left-4"
          )}
          title={isPanelOpen ? "Ocultar panel" : "Mostrar información"}
        >
          {isPanelOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <aside
          className={cn(
            "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            isPanelOpen ? "w-80 opacity-100" : "w-0 opacity-0"
          )}
        >
          <div className={cn(
            "sticky top-6 space-y-4 w-80 transition-transform duration-300",
            isPanelOpen ? "translate-x-0" : "translate-x-full"
          )}>
            {/* Título del panel */}
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Información del proyecto
            </h2>

            {/* Fecha límite */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha límite
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

            {/* Presupuesto */}
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

            {/* Cliente */}
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

            {/* Miembros del equipo */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Miembros del equipo
                </CardTitle>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowAddMember(!showAddMember)}
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Add member dropdown */}
                {showAddMember && availableUsers && availableUsers.length > 0 && (
                  <div className="p-2 bg-muted rounded-md space-y-1">
                    <p className="text-xs font-medium mb-1">Añadir usuario:</p>
                    {availableUsers.map((user) => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => handleAddMember(user.id)}
                        disabled={addMember.isPending}
                      >
                        {addMember.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        {user.full_name}
                      </Button>
                    ))}
                  </div>
                )}

                {showAddMember && (!availableUsers || availableUsers.length === 0) && (
                  <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
                    Todos asignados
                  </p>
                )}

                {/* Members list */}
                {membersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.profile.full_name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">
                              {member.profile.full_name}
                            </p>
                            <Badge
                              variant={member.profile.role === "admin" ? "default" : "secondary"}
                              className="text-[9px] px-1 py-0"
                            >
                              {member.profile.role === "admin" ? "Admin" : "Colab"}
                            </Badge>
                          </div>
                        </div>
                        {isAdmin && member.profile.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removeMember.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Sin miembros asignados
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cuotas de Pago */}
            {project.metadata?.payment_installments && project.metadata.payment_installments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cuotas de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.metadata.payment_installments.map((installment, index) => {
                    const approvedPayment = getApprovedPayment(installment.number);
                    const pendingPayment = getPendingPayment(installment.number);

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          // Solo abrir modal si no está pagada, no tiene pago pendiente y puede pagar
                          if (!installment.paid && !pendingPayment && canPay) {
                            setSelectedInstallment(installment);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-md text-xs transition-colors",
                          installment.paid
                            ? "bg-emerald-50 border border-emerald-200"
                            : pendingPayment
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-muted/50",
                          // Hacer clickeable si no está pagada, no tiene pago pendiente y puede pagar
                          !installment.paid && !pendingPayment && canPay && "cursor-pointer hover:bg-muted hover:border hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-medium",
                              installment.paid
                                ? "bg-emerald-500 text-white"
                                : pendingPayment
                                ? "bg-amber-500 text-white"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {installment.paid ? <Check className="h-3 w-3" /> : `${installment.number}`}
                            </div>
                            <div>
                              <p className="font-medium">
                                S/ {installment.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Vence: {new Date(installment.date).toLocaleDateString("es-PE", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={installment.paid ? "default" : pendingPayment ? "secondary" : "secondary"}
                            className={cn(
                              "text-[9px] px-1.5 py-0",
                              installment.paid && "bg-emerald-600",
                              pendingPayment && "bg-amber-500 text-white"
                            )}
                          >
                            {installment.paid ? "Pagado" : pendingPayment ? "En revision" : canPay ? "Pagar" : "Pend."}
                          </Badge>
                        </div>

                        {/* Info del pago aprobado */}
                        {approvedPayment && (
                          <div className="mt-2 pt-2 border-t border-emerald-200 text-[10px] space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                              <span>ID Transaccion:</span>
                              <span className="font-mono">{approvedPayment.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Fecha de pago:</span>
                              <span>{new Date(approvedPayment.reviewed_at || approvedPayment.submitted_at).toLocaleDateString("es-PE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Monto:</span>
                              <span className="font-medium text-emerald-700">
                                S/ {approvedPayment.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Info del pago pendiente */}
                        {pendingPayment && !installment.paid && (
                          <div className="mt-2 pt-2 border-t border-amber-200 text-[10px] space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                              <span>ID Solicitud:</span>
                              <span className="font-mono">{pendingPayment.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Enviado:</span>
                              <span>{new Date(pendingPayment.submitted_at).toLocaleDateString("es-PE", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}</span>
                            </div>
                            <p className="text-amber-700 font-medium">Pago en revision por admin</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t text-xs font-medium">
                    <span>Total:</span>
                    <span>
                      S/ {project.metadata.payment_installments
                        .reduce((sum, inst) => sum + inst.amount, 0)
                        .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </div>

      {/* Modal de pago de cuota */}
      {selectedInstallment && (
        <PaymentSubmissionModal
          isOpen={!!selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
          projectId={id}
          projectName={project.name}
          installment={selectedInstallment}
          adminUserIds={adminUserIds}
        />
      )}
    </div>
  );
}