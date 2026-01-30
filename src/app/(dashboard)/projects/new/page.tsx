"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useCurrentProfile } from "@/hooks/use-profile";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();

  const isAdmin = profile?.role === "admin";

  // Redirigir a colaboradores que intenten acceder directamente
  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      router.replace("/projects");
    }
  }, [profile, profileLoading, isAdmin, router]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deadline: "",
    budget: "",
    client_id: "",
    installments_count: "1", // Número de cuotas
  });
  const [error, setError] = useState("");

  // Generar cuotas de pago automáticamente
  const generateInstallments = () => {
    const budget = parseFloat(formData.budget);
    const count = parseInt(formData.installments_count);

    if (!budget || budget <= 0 || !count || count <= 0) return [];

    const amountPerInstallment = Math.round((budget / count) * 100) / 100;
    const today = new Date();

    return Array.from({ length: count }, (_, i) => {
      // Distribuir fechas: si hay deadline, distribuir hasta ahí, sino mensualmente
      let dueDate: Date;
      if (formData.deadline) {
        const deadline = new Date(formData.deadline);
        const totalDays = Math.max(1, Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const daysPerInstallment = Math.floor(totalDays / count);
        dueDate = new Date(today.getTime() + (daysPerInstallment * (i + 1)) * (1000 * 60 * 60 * 24));
      } else {
        // Sin deadline: una cuota por mes
        dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
      }

      return {
        number: i + 1,
        amount: i === count - 1
          ? Math.round((budget - amountPerInstallment * (count - 1)) * 100) / 100 // Última cuota ajusta diferencia
          : amountPerInstallment,
        date: dueDate.toISOString().split('T')[0],
        paid: false,
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
      await createProject.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        deadline: formData.deadline || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        client_id: formData.client_id || undefined,
        status: "inicio",
        metadata: installments.length > 0 ? { payment_installments: installments } : undefined,
      });
      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proyecto");
    }
  };

  const selectedClient = clients?.find((c) => c.id === formData.client_id);

  // Mostrar loading mientras verifica permisos
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No renderizar nada si no es admin (el useEffect redirigirá)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Nuevo Proyecto
          </h1>
          <p className="text-muted-foreground">
            Crea un nuevo proyecto para tu agencia
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

            {/* Client selector */}
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
              {selectedClient && (
                <p className="text-xs text-muted-foreground">
                  {selectedClient.email || "Sin email"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Selector de cuotas - solo aparece si hay presupuesto */}
            {formData.budget && parseFloat(formData.budget) > 0 && (
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
                    <p className="text-sm font-medium text-muted-foreground">Vista previa de cuotas:</p>
                    <div className="grid gap-2">
                      {installments.map((inst) => (
                        <div
                          key={inst.number}
                          className="flex items-center justify-between p-2 bg-background rounded-md border text-sm"
                        >
                          <span className="font-medium">Cuota {inst.number}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {new Date(inst.date).toLocaleDateString("es-PE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                            <span className="font-semibold text-primary">
                              S/ {inst.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Las fechas se distribuyen automáticamente hasta la fecha límite
                    </p>
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
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Proyecto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}