"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/types/transaction";
import { z } from "zod";

// ==============================================
// Schemas de validacion
// ==============================================

const createTransactionSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "La categoria es requerida"),
  description: z.string().max(500).optional(),
  project_id: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// ==============================================
// Server Actions (SOLO ADMIN - RLS bloquea para users)
// ==============================================

export async function createTransaction(input: CreateTransactionInput) {
  try {
    const validated = createTransactionSchema.parse(input);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "No autorizado", data: null };
    }

    const { data, error } = await (supabase.from("transactions") as any)
      .insert({
        amount: validated.amount,
        type: validated.type,
        category: validated.category,
        description: validated.description,
        project_id: validated.project_id,
        date: validated.date ?? new Date().toISOString().split("T")[0],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // RLS bloqueara a usuarios no-admin
      if (error.code === "42501") {
        return { error: "No tienes permisos para crear transacciones", data: null };
      }
      return { error: error.message, data: null };
    }

    revalidatePath("/finances");
    revalidatePath("/dashboard");

    return { error: null, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message, data: null };
    }
    return { error: "Error inesperado", data: null };
  }
}

export async function updateTransaction(
  id: string,
  input: Partial<CreateTransactionInput>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado", data: null };
  }

  const { data, error } = await (supabase.from("transactions") as any)
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");

  return { error: null, data };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  const { error } = await (supabase.from("transactions") as any).delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");

  return { error: null };
}
