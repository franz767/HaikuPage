import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const type = searchParams.get("type");
    const clientId = searchParams.get("client_id");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Si es una invitación de cliente, actualizar el perfil
            if (type === "invite" && clientId) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        role: "cliente",
                        client_id: clientId,
                    })
                    .eq("id", data.user.id);

                if (profileError) {
                    console.error("Error updating profile for invited client:", profileError);
                }

                // Redirigir al dashboard de proyectos (único acceso del cliente)
                return NextResponse.redirect(`${origin}/projects`);
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Si hay error, redirigir a login con mensaje
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
