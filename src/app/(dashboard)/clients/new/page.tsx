"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { inviteClient } from "@/actions/clients";
import { useCurrentProfile } from "@/hooks/use-profile";

export default function NewClientPage() {
  const router = useRouter();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentProfile();
  const isAdmin = profile?.role === "admin";

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // No es admin - acceso denegado
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Acceso denegado</h1>
        </div>
        <p className="text-muted-foreground">
          Solo los administradores pueden crear nuevos clientes.
        </p>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre del cliente es requerido");
      return;
    }

    if (!formData.email.trim()) {
      setError("El email es requerido para enviar la invitación");
      return;
    }

    setIsLoading(true);

    try {
      const result = await inviteClient({
        name: formData.name.trim(),
        company: formData.company.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Error al crear cliente");
        return;
      }

      setDefaultPassword(result.defaultPassword || "");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cliente");
    } finally {
      setIsLoading(false);
    }
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold">¡Cliente creado!</h2>
              <p className="text-muted-foreground max-w-md">
                El cliente <strong>{formData.name}</strong> ha sido creado exitosamente.
                Comparte las siguientes credenciales para que pueda acceder al sistema:
              </p>

              {/* Credenciales */}
              <div className="w-full max-w-sm bg-muted/50 rounded-lg p-4 space-y-3 text-left">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="font-mono font-medium">{formData.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Contraseña</p>
                  <p className="font-mono font-medium">{defaultPassword}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Se recomienda que el cliente cambie su contraseña después del primer inicio de sesión.
              </p>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => {
                  setSuccess(false);
                  setDefaultPassword("");
                  setFormData({ name: "", company: "", email: "", phone: "", notes: "" });
                }}>
                  Crear otro cliente
                </Button>
                <Button onClick={() => router.push("/clients")}>
                  Volver a clientes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Nuevo Cliente
          </h1>
          <p className="text-muted-foreground">
            Invita un nuevo cliente a tu agencia
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Información del Cliente
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Se creará una cuenta con contraseña por defecto para el cliente.
          </p>
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
                Nombre *
              </label>
              <Input
                id="name"
                placeholder="Ej: Juan Perez"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium">
                Empresa
              </label>
              <Input
                id="company"
                placeholder="Ej: Tech Solutions SL"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email * <span className="text-muted-foreground font-normal">(para login)</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Teléfono
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notas
              </label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Notas adicionales sobre el cliente..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Mail className="mr-2 h-4 w-4" />
                Crear Cliente
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}