"use client";

import Link from "next/link";
import { Plus, UsersRound, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollaborators, useDeleteCollaborator } from "@/hooks/use-collaborators";
import { useCurrentProfile } from "@/hooks/use-profile";

export default function CollaboratorsPage() {
    const { data: collaborators, isLoading, error } = useCollaborators();
    const deleteCollaborator = useDeleteCollaborator();
    const { data: profile } = useCurrentProfile();

    const isAdmin = profile?.role === "admin";

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el acceso al colaborador "${name}"? Esta acción no se puede deshacer.`)) return;

        try {
            await deleteCollaborator.mutateAsync(id);
        } catch (err) {
            alert("Error al eliminar: " + (err as Error).message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Colaboradores</h1>
                    <p className="text-muted-foreground">
                        Gestiona el equipo de tu agencia
                    </p>
                </div>
                {isAdmin && (
                    <Button asChild>
                        <Link href="/collaborators/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Colaborador
                        </Link>
                    </Button>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-[120px]" />
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 text-red-600 bg-red-50 rounded-md">
                    Error al cargar colaboradores: {error.message}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && collaborators?.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <UsersRound className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No hay colaboradores</h3>
                        <p className="text-muted-foreground mb-4">
                            Invita a tu equipo para gestionar proyectos juntos
                        </p>
                        {isAdmin && (
                            <Button asChild>
                                <Link href="/collaborators/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Invitar Colaborador
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* List */}
            {!isLoading && collaborators && collaborators.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {collaborators.map((collab) => (
                        <Card key={collab.id} className="group relative">
                            <CardContent className="p-5 flex items-start gap-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={collab.avatar_url || ""} />
                                    <AvatarFallback>{collab.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>

                                <div className="flex-1 space-y-1">
                                    <h3 className="font-semibold">{collab.full_name}</h3>
                                    <p className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 w-fit">
                                        Colaborador
                                    </p>

                                    <div className="text-xs text-muted-foreground pt-1">
                                        Incorporado el {new Date(collab.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {isAdmin && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(collab.id, collab.full_name)}
                                        title="Eliminar colaborador"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
