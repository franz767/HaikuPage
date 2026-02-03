"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClient, useUpdateClient, clientKeys } from "@/hooks/use-clients";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useQueryClient } from "@tanstack/react-query";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditClientPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: client, isLoading, error } = useClient(id);
    const { data: profile } = useCurrentProfile();
    const updateClient = useUpdateClient();

    const [formData, setFormData] = useState({
        name: "",
        company: "",
        email: "",
        phone: "",
        notes: "",
    });
    const [formError, setFormError] = useState("");

    // Verificar si es admin
    const isAdmin = profile?.role === "admin";

    // Cargar datos del cliente cuando se obtienen
    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || "",
                company: client.company || "",
                email: client.email || "",
                phone: client.phone || "",
                notes: client.notes || "",
            });
        }
    }, [client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!formData.name.trim()) {
            setFormError("El nombre del cliente es requerido");
            return;
        }

        try {
            await updateClient.mutateAsync({
                id,
                name: formData.name,
                company: formData.company || null,
                email: formData.email || null,
                phone: formData.phone || null,
                notes: formData.notes || null,
            });
            // Invalidar cache para que se refetch al volver a la lista
            await queryClient.invalidateQueries({ queryKey: clientKeys.all });
            router.push("/clients");
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Error al actualizar cliente");
        }
    };

    // Loading state
    if (isLoading) {
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

    // Error o no encontrado
    if (error || !client) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/clients">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-semibold">Cliente no encontrado</h1>
                </div>
                <p className="text-muted-foreground">
                    {error?.message || "El cliente no existe o no tienes acceso."}
                </p>
            </div>
        );
    }

    // No es admin
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
                    Solo los administradores pueden editar clientes.
                </p>
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
                        Editar Cliente
                    </h1>
                    <p className="text-muted-foreground">
                        Modifica la información de {client.name}
                    </p>
                </div>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                                {formError}
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
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="cliente@email.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
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
                            <Button type="submit" disabled={updateClient.isPending}>
                                {updateClient.isPending && (
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
