"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface InviteCollaboratorInput {
    email: string;
    fullName: string;
}

interface InviteCollaboratorResult {
    success: boolean;
    error?: string;
    userId?: string;
}

/**
 * Invitar a un colaborador por email
 * Utiliza supabase.auth.admin.inviteUserByEmail
 */
export async function inviteCollaborator(input: InviteCollaboratorInput): Promise<InviteCollaboratorResult> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verificar que el usuario actual es admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "No autenticado" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { success: false, error: "Solo los administradores pueden invitar colaboradores" };
    }

    // Validar email
    if (!input.email || !input.email.includes("@")) {
        return { success: false, error: "El email es requerido" };
    }

    if (!input.fullName.trim()) {
        return { success: false, error: "El nombre es requerido" };
    }

    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Invitar al usuario con rol 'colaborador'
        // El trigger handle_new_user se encargará de crear el perfil,
        // pero pasamos data adicional para que la use si está configurado para ello
        // o para actualizarlo después.
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
            input.email,
            {
                redirectTo: `${appUrl}/auth/callback?type=invite_collaborator`,
                data: {
                    full_name: input.fullName,
                    role: "colaborador",
                },
            }
        );

        if (error) {
            console.error("Error inviting collaborator:", error);
            return { success: false, error: "Error al enviar invitación: " + error.message };
        }

        // NOTA: El trigger handle_new_user crea el perfil automáticamente al confirmar,
        // pero como usamos inviteUserByEmail, el usuario se crea ya confirmado (o pendiente).
        // Si queremos asegurar que el perfil tenga los datos correctos inmediamente:

        if (data.user) {
            // Intentar actualizar el perfil si ya existe (a veces se crea al instante)
            // Ojo: inviteUserByEmail crea el usuario en auth.users.
            // El trigger debería dispararse PERO a veces con invites es distinto.
            // Lo más seguro es confiar en el metadata y que el callback/trigger haga su trabajo.
            console.log("Colaborador invitado:", data.user.id);
        }

        return {
            success: true,
            userId: data.user?.id
        };

    } catch (error) {
        console.error("Error in inviteCollaborator:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

/**
 * Eliminar un colaborador (usuario)
 */
export async function deleteCollaborator(userId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verificar admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        throw new Error("No autorizado");
    }

    // Eliminar usuario de auth.users (esto elimina el perfil por cascada si está configurado,
    // sino habrá que eliminar el perfil manualmente)
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
        throw new Error(error.message);
    }

    return { success: true };
}
