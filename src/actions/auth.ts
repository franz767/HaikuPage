"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ==============================================
// Schemas
// ==============================================

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, "El nombre es requerido"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// ==============================================
// Server Actions
// ==============================================

export async function login(input: LoginInput) {
  try {
    const validated = loginSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      return { error: error.message };
    }

    // Guardar el session_id actual para validar sesión única
    if (data.session) {
      await supabase
        .from("profiles")
        .update({ current_session_id: data.session.access_token.slice(-32) })
        .eq("id", data.user.id);
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message };
    }
    // Re-throw redirect
    throw err;
  }
}

export async function signup(input: SignupInput) {
  try {
    const validated = signupSchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          full_name: validated.full_name,
          role: "user", // Por defecto, nuevos usuarios son 'user'
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message };
    }
    throw err;
  }
}

export async function logout() {
  const supabase = await createClient();

  // Limpiar session_id antes de cerrar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ current_session_id: null })
      .eq("id", user.id);
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
