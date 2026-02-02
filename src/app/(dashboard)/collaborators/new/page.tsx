"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, CheckCircle, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInviteCollaborator } from "@/hooks/use-collaborators";

export default function NewCollaboratorPage() {
    const router = useRouter();
    const inviteCollaborator = useInviteCollaborator();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.fullName.trim()) {
            setError("El nombre es requerido");
            return;
        }

        if (!formData.email.trim()) {
            setError("El email es requerido");
            return;
        }

        try {
            const result = await inviteCollaborator.mutateAsync({
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
            });

            if (!result.success) {
                setError(result.error || "Error al invitar colaborador");
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al invitar colaborador");
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
                            <h2 className="text-2xl font-semibold">¡Invitación enviada!</h2>
                            <p className="text-muted-foreground max-w-md">
                                Se ha enviado un email de invitación a <strong>{formData.email}</strong>.
                                El colaborador podrá acceder al sistema una vez que confirme su cuenta.
                            </p>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={() => {
                                    setSuccess(false);
                                    setFormData({ fullName: "", email: "" });
                                }}>
                                    Invitar otro
                                </Button>
                                <Button onClick={() => router.push("/collaborators")}>
                                    Volver a lista
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
                    <Link href="/collaborators">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Nuevo Colaborador
                    </h1>
                    <p className="text-muted-foreground">
                        Invita a un miembro al equipo
                    </p>
                </div>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersRound className="h-5 w-5" />
                        Información del Colaborador
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Se enviará un email de invitación con instrucciones de acceso.
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
                            <label htmlFor="fullName" className="text-sm font-medium">
                                Nombre completo *
                            </label>
                            <Input
                                id="fullName"
                                placeholder="Ej: Ana García"
                                value={formData.fullName}
                                onChange={(e) =>
                                    setFormData({ ...formData, fullName: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email *
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="colaborador@tu-agencia.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
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
                            <Button type="submit" disabled={inviteCollaborator.isPending}>
                                {inviteCollaborator.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <Mail className="mr-2 h-4 w-4" />
                                Enviar Invitación
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
