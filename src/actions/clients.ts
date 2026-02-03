"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface InviteClientInput {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    notes?: string;
}

interface InviteClientResult {
    success: boolean;
    error?: string;
    clientId?: string;
    defaultPassword?: string;
}

/**
 * Invitar a un cliente por email
 * 1. Crea el registro del cliente en la tabla clients
 * 2. Crea el usuario en auth.users con invitación por email
 * 3. Crea el perfil con rol 'cliente' vinculado al cliente
 */
export async function inviteClient(input: InviteClientInput): Promise<InviteClientResult> {
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
        return { success: false, error: "Solo los administradores pueden invitar clientes" };
    }

    // Validar email
    if (!input.email || !input.email.includes("@")) {
        return { success: false, error: "El email es requerido para enviar la invitación" };
    }

    try {
        // 1. Verificar si el email ya existe en auth.users
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some(u => u.email === input.email);

        if (emailExists) {
            return { success: false, error: "Ya existe un usuario con este email" };
        }

        // 2. Crear el registro del cliente primero
        const { data: client, error: clientError } = await supabase
            .from("clients")
            .insert({
                name: input.name,
                company: input.company || null,
                email: input.email,
                phone: input.phone || null,
                notes: input.notes || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (clientError) {
            console.error("Error creating client:", clientError);
            return { success: false, error: "Error al crear el cliente: " + clientError.message };
        }

        // 3. Crear el usuario con contraseña por defecto usando el admin client
        const defaultPassword = "Cliente2024!";

        const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
            email: input.email,
            password: defaultPassword,
            email_confirm: true, // Confirmar email automaticamente
            user_metadata: {
                full_name: input.name,
                role: "cliente",
                client_id: client.id,
            },
        });

        if (userError) {
            // Si falla la creacion del usuario, eliminar el cliente creado
            await supabase.from("clients").delete().eq("id", client.id);
            console.error("Error creating user:", userError);
            return { success: false, error: "Error al crear usuario: " + userError.message };
        }

        // 4. Crear el perfil con rol cliente
        if (userData.user) {
            const { error: profileError } = await adminClient
                .from("profiles")
                .upsert({
                    id: userData.user.id,
                    full_name: input.name,
                    role: "cliente",
                    client_id: client.id,
                });

            if (profileError) {
                console.error("Error creating profile:", profileError);
            }

            // 5. Actualizar el cliente con el user_id
            await supabase
                .from("clients")
                .update({ user_id: userData.user.id })
                .eq("id", client.id);
        }

        console.log("Cliente creado exitosamente:", {
            clientId: client.id,
            userId: userData.user?.id,
            email: input.email,
            password: defaultPassword,
        });

        return {
            success: true,
            clientId: client.id,
            defaultPassword: defaultPassword,
        };

    } catch (error) {
        console.error("Error in inviteClient:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}
