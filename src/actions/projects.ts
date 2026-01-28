"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectMetadata, ProjectStatus } from "@/types/project";
import { z } from "zod";

// ==============================================
// Schemas de validacion
// ==============================================

const createProjectSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(2000).optional(),
  status: z
    .enum(["draft", "active", "on_hold", "completed", "cancelled"])
    .default("draft"),
  deadline: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  metadata: z
    .object({
      n8n_workflow_id: z.string().optional().nullable(),
      ai_prompts: z.record(z.string()).optional(),
      integrations: z.record(z.string()).optional(),
      custom_fields: z.record(z.unknown()).optional(),
    })
    .optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ==============================================
// Server Actions
// ==============================================

export async function createProject(input: CreateProjectInput) {
  try {
    // Validar input
    const validated = createProjectSchema.parse(input);

    const supabase = await createClient();

    // Verificar autenticacion
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "No autorizado", data: null };
    }

    // Insertar proyecto
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: validated.name,
        description: validated.description,
        status: validated.status,
        deadline: validated.deadline,
        client_id: validated.client_id,
        budget: validated.budget,
        metadata: validated.metadata ?? {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return { error: error.message, data: null };
    }

    // Revalidar cache
    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { error: null, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message, data: null };
    }
    return { error: "Error inesperado", data: null };
  }
}

export async function updateProject(input: UpdateProjectInput) {
  try {
    const validated = updateProjectSchema.parse(input);
    const { id, ...updates } = validated;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "No autorizado", data: null };
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath("/dashboard");

    return { error: null, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message, data: null };
    }
    return { error: "Error inesperado", data: null };
  }
}

export async function updateProjectMetadata(
  projectId: string,
  metadata: Partial<ProjectMetadata>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado", data: null };
  }

  // Obtener metadata actual y hacer merge
  const { data: current, error: fetchError } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();

  if (fetchError) {
    return { error: fetchError.message, data: null };
  }

  const mergedMetadata = {
    ...((current?.metadata as ProjectMetadata) ?? {}),
    ...metadata,
  };

  const { data, error } = await supabase
    .from("projects")
    .update({ metadata: mergedMetadata })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null, data };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");

  return { error: null };
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado", data: null };
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");

  return { error: null, data };
}
