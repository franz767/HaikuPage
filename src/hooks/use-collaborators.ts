"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { deleteCollaborator, inviteCollaborator } from "@/actions/collaborators";

// Keys para react-query
export const collaboratorKeys = {
    all: ["collaborators"] as const,
    lists: () => [...collaboratorKeys.all, "list"] as const,
};

export interface Collaborator {
    id: string;
    role: string;
    full_name: string;
    email?: string;
    avatar_url: string | null;
    created_at: string;
}

/**
 * Hook para listar colaboradores
 */
export function useCollaborators() {
    const supabase = createClient();

    return useQuery({
        queryKey: collaboratorKeys.lists(),
        queryFn: async (): Promise<Collaborator[]> => {
            // 1. Obtener perfiles con rol de colaborador
            const { data: profiles, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("role", "colaborador")
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);

            // Como los emails no están en profiles (por seguridad), 
            // necesitaríamos una función admin o edge function para obtenerlos.
            // Por ahora mostraremos solo los datos del perfil que es lo público.
            // Si necesitamos emails, habría que obtenerlos en una Server Action o View protegida.

            return profiles as Collaborator[];
        },
    });
}

/**
 * Hook para invitar colaboradores
 */
export function useInviteCollaborator() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: inviteCollaborator,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: collaboratorKeys.lists() });
        },
    });
}

/**
 * Hook para eliminar colaboradores
 */
export function useDeleteCollaborator() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCollaborator,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: collaboratorKeys.lists() });
        },
    });
}
