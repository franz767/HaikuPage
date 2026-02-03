"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useCurrentProfile } from "@/hooks/use-profile";

interface Installment {
  number: number;
  amount: string;
  date: string;
  paid: boolean;
}

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
    installments_count: "1",
  });
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  // Generar cuotas iniciales cuando cambia el número de cuotas o el presupuesto
  useEffect(() => {
    const budget = parseFloat(formData.budget);
    const count = parseInt(formData.installments_count);

    if (!budget || budget <= 0 || !count || count <= 0) {
      setInstallments([]);
      return;
    }

    // Mantener valores existentes si es posible
    const newInstallments: Installment[] = Array.from({ length: count }, (_, i) => {
      const existing = installments[i];
      const today = new Date();
      today.setMonth(today.getMonth() + i + 1);
      const defaultDate = today.toISOString().split('T')[0];

      return {
        number: i + 1,
        amount: existing?.amount || "",
        date: existing?.date || defaultDate,
        paid: false,
      };
    });

    setInstallments(newInstallments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.installments_count, formData.budget]);

  // Actualizar una cuota específica
  const updateInstallment = (index: number, field: "amount" | "date", value: string) => {
    // Prevenir montos negativos
    if (field === "amount" && parseFloat(value) < 0) {
      return;
    }
    setInstallments(prev => prev.map((inst, i) =>
      i === index ? { ...inst, [field]: value } : inst
    ));
  };

  // Prevenir caracteres no numéricos en inputs de monto (como 'e', '+', '-')
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Calcular el total de cuotas
  const totalInstallments = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
  const budget = parseFloat(formData.budget) || 0;
  const difference = budget - totalInstallments;

  // Función para mostrar error y hacer scroll
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      showError("El nombre del proyecto es requerido");
      return;
    }

    // Validar cuotas si hay presupuesto
    if (budget > 0 && installments.length > 0) {
      const emptyAmounts = installments.filter(inst => !inst.amount || parseFloat(inst.amount) <= 0);
      const negativeAmounts = installments.filter(inst => parseFloat(inst.amount) < 0);
      const emptyDates = installments.filter(inst => !inst.date);

      if (negativeAmounts.length > 0) {
        showError(`Las cuotas ${negativeAmounts.map(i => i.number).join(", ")} tienen montos negativos. Por favor ingresa valores válidos.`);
        return;
      }
      if (emptyAmounts.length > 0) {
        showError(`Las cuotas ${emptyAmounts.map(i => i.number).join(", ")} no tienen monto. Por favor completa todos los montos.`);
        return;
      }
      if (emptyDates.length > 0) {
        showError(`Las cuotas ${emptyDates.map(i => i.number).join(", ")} no tienen fecha. Por favor completa todas las fechas.`);
        return;
      }

      // Validar que el total de cuotas sea exactamente igual al presupuesto
      const total = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
      const diff = Math.abs(budget - total);
      if (diff > 0.01) {
        if (total < budget) {
          showError(`El total de las cuotas (S/ ${total.toFixed(2)}) es menor que el presupuesto (S/ ${budget.toFixed(2)}). Faltan S/ ${(budget - total).toFixed(2)}.`);
        } else {
          showError(`El total de las cuotas (S/ ${total.toFixed(2)}) excede el presupuesto (S/ ${budget.toFixed(2)}) por S/ ${(total - budget).toFixed(2)}.`);
        }
        return;
      }
    }

    // Preparar cuotas para guardar
    const formattedInstallments = installments.map(inst => ({
      number: inst.number,
      amount: parseFloat(inst.amount) || 0,
      date: inst.date,
      paid: false,
    }));

    try {
      await createProject.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        deadline: formData.deadline || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        client_id: formData.client_id || undefined,
        status: "inicio",
        metadata: formattedInstallments.length > 0 ? { payment_installments: formattedInstallments } : undefined,
      });
      router.push("/projects");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al crear proyecto");
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
              <div
                ref={errorRef}
                className="p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error al crear proyecto</p>
                  <p className="mt-1">{error}</p>
                </div>
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
                  onKeyDown={handleKeyDown}
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

                {/* Cuotas editables */}
                {installments.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Configurar cuotas:</p>
                    <div className="grid gap-3">
                      {installments.map((inst, index) => (
                        <div
                          key={inst.number}
                          className="flex items-center gap-3 p-3 bg-background rounded-md border"
                        >
                          <span className="font-medium text-sm w-20 shrink-0">Cuota {inst.number}</span>
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Fecha</label>
                              <Input
                                type="date"
                                value={inst.date}
                                onChange={(e) => updateInstallment(index, "date", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Monto (S/)</label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={inst.amount}
                                onChange={(e) => updateInstallment(index, "amount", e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Resumen de totales */}
                    <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                      <span className="text-sm font-medium">Total cuotas:</span>
                      <div className="text-right">
                        <span className={`font-semibold ${Math.abs(difference) > 0.01 ? "text-amber-600" : "text-green-600"}`}>
                          S/ {totalInstallments.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                        {Math.abs(difference) > 0.01 && (
                          <p className="text-xs text-amber-600">
                            {difference > 0 ? `Faltan S/ ${difference.toFixed(2)}` : `Excede S/ ${Math.abs(difference).toFixed(2)}`}
                          </p>
                        )}
                      </div>
                    </div>
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