"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useCurrentProfile } from "@/hooks/use-profile";
import { PROJECT_STATUS, type ProjectStatus, type PaymentInstallment } from "@/types/project";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProjectPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const { data: project, isLoading } = useProject(id);
  const { data: clients, isLoading: clientsLoading } = useClients();
  const updateProject = useUpdateProject();

  const isAdmin = profile?.role === "admin";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "inicio" as ProjectStatus,
    deadline: "",
    budget: "",
    client_id: "",
    installments_count: "1",
  });
  const [existingInstallments, setExistingInstallments] = useState<PaymentInstallment[]>([]);
  const [error, setError] = useState("");

  // Cargar datos del proyecto cuando esté disponible
  useEffect(() => {
    if (project) {
      const existingPaymentInstallments = project.metadata?.payment_installments || [];
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "inicio",
        deadline: project.deadline || "",
        budget: project.budget?.toString() || "",
        client_id: project.client_id || "",
        installments_count: existingPaymentInstallments.length > 0
          ? existingPaymentInstallments.length.toString()
          : "1",
      });
      setExistingInstallments(existingPaymentInstallments);
    }
  }, [project]);

  // Generar cuotas de pago automáticamente
  const generateInstallments = (): PaymentInstallment[] => {
    const budget = parseFloat(formData.budget);
    const count = parseInt(formData.installments_count);

    if (!budget || budget <= 0 || !count || count <= 0) return [];

    const amountPerInstallment = Math.round((budget / count) * 100) / 100;
    const today = new Date();

    return Array.from({ length: count }, (_, i) => {
      // Verificar si ya existe una cuota con este número
      const existingInst = existingInstallments.find(inst => inst.number === i + 1);

      // Distribuir fechas
      let dueDate: Date;
      if (formData.deadline) {
        const deadline = new Date(formData.deadline);
        const totalDays = Math.max(1, Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const daysPerInstallment = Math.floor(totalDays / count);
        dueDate = new Date(today.getTime() + (daysPerInstallment * (i + 1)) * (1000 * 60 * 60 * 24));
      } else {
        dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
      }

      return {
        number: i + 1,
        amount: i === count - 1
          ? Math.round((budget - amountPerInstallment * (count - 1)) * 100) / 100
          : amountPerInstallment,
        date: existingInst?.date || dueDate.toISOString().split('T')[0],
        paid: existingInst?.paid || false, // Mantener estado de pago si existe
      };
    });
  };

  const installments = generateInstallments();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre del proyecto es requerido");
      return;
    }

    try {
      // Preparar metadata con las cuotas
      const currentMetadata = project?.metadata || {};
      const newMetadata = {
        ...currentMetadata,
        payment_installments: installments.length > 0 ? installments : undefined,
      };

      await updateProject.mutateAsync({
        id,
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        deadline: formData.deadline || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        client_id: formData.client_id || undefined,
        metadata: newMetadata,
      });
      router.push(`/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Proyecto no encontrado</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar Proyecto
          </h1>
          <p className="text-muted-foreground">
            Modifica la informacion del proyecto
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion del Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre del proyecto *
              </label>
              <Input
                id="name"
                placeholder="Ej: Rediseno Web Corporativa"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descripcion
              </label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Describe el proyecto..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Status selector */}
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Estado
              </label>
              <div className="relative">
                <select
                  id="status"
                  className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-10"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as ProjectStatus,
                    })
                  }
                >
                  {Object.entries(PROJECT_STATUS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Client selector - Solo Admin */}
            {isAdmin && (
              <div className="space-y-2">
                <label htmlFor="client" className="text-sm font-medium">
                  Cliente
                </label>
                <div className="relative">
                  <select
                    id="client"
                    className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-10"
                    value={formData.client_id}
                    onChange={(e) =>
                      setFormData({ ...formData, client_id: e.target.value })
                    }
                    disabled={clientsLoading}
                  >
                    <option value="">Sin cliente asignado</option>
                    {clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                        {client.company ? ` (${client.company})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="deadline" className="text-sm font-medium">
                Fecha limite
              </label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>

            {/* Presupuesto - Solo Admin */}
            {isAdmin && (
              <div className="space-y-2">
                <label htmlFor="budget" className="text-sm font-medium">
                  Presupuesto (S/)
                </label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                />
              </div>
            )}

            {/* Selector de cuotas - solo aparece si hay presupuesto y es admin */}
            {isAdmin && formData.budget && parseFloat(formData.budget) > 0 && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-2">
                  <label htmlFor="installments" className="text-sm font-medium">
                    Número de cuotas
                  </label>
                  <div className="relative">
                    <select
                      id="installments"
                      className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-10"
                      value={formData.installments_count}
                      onChange={(e) =>
                        setFormData({ ...formData, installments_count: e.target.value })
                      }
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "cuota" : "cuotas"}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Preview de cuotas */}
                {installments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Cuotas del proyecto:</p>
                    <div className="grid gap-2">
                      {installments.map((inst) => (
                        <div
                          key={inst.number}
                          className={`flex items-center justify-between p-2 rounded-md border text-sm ${inst.paid
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-background"
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${inst.paid ? "text-emerald-700" : ""}`}>
                              Cuota {inst.number}
                            </span>
                            {inst.paid && (
                              <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                Pagado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {(() => {
                                const [y, m, d] = inst.date.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString("es-PE", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                });
                              })()}
                            </span>
                            <span className={`font-semibold ${inst.paid ? "text-emerald-700" : "text-primary"}`}>
                              S/ {inst.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {existingInstallments.some(i => i.paid) && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Las cuotas ya pagadas mantienen su estado
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}