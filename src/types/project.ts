import type { Database } from "./database";

// Tipo base de la tabla
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];

// ==============================================
// Tipos para el campo JSONB metadata
// ==============================================

export interface AIPrompts {
  summary?: string;
  tasks?: string;
  [key: string]: string | undefined;
}

export interface ProjectIntegrations {
  slack_channel?: string;
  notion_page?: string;
  github_repo?: string;
  [key: string]: string | undefined;
}

export interface ProjectMetadata {
  n8n_workflow_id?: string | null;
  ai_prompts?: AIPrompts;
  integrations?: ProjectIntegrations;
  custom_fields?: Record<string, unknown>;
}

// Project con metadata tipado correctamente
export interface ProjectWithMetadata extends Omit<Project, "metadata"> {
  metadata: ProjectMetadata;
}

// Project con relaciones expandidas (para queries con joins)
export interface ProjectWithRelations extends ProjectWithMetadata {
  client?: {
    id: string;
    name: string;
    company: string | null;
  } | null;
  members?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
}

// ==============================================
// Constantes de estados
// ==============================================

export const PROJECT_STATUS = {
  draft: { label: "Borrador", color: "secondary" },
  active: { label: "Activo", color: "default" },
  on_hold: { label: "En pausa", color: "warning" },
  completed: { label: "Completado", color: "success" },
  cancelled: { label: "Cancelado", color: "destructive" },
} as const;

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS).map(
  ([value, { label }]) => ({
    value: value as ProjectStatus,
    label,
  })
);

// ==============================================
// Type guards y utilidades
// ==============================================

export function hasAIConfiguration(metadata: ProjectMetadata): boolean {
  return Boolean(
    metadata?.n8n_workflow_id ||
      (metadata?.ai_prompts && Object.keys(metadata.ai_prompts).length > 0)
  );
}

export function hasIntegrations(metadata: ProjectMetadata): boolean {
  return Boolean(
    metadata?.integrations && Object.keys(metadata.integrations).length > 0
  );
}
