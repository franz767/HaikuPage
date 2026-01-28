import type { Database } from "./database";

// Tipos base
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

// Client con conteo de proyectos
export interface ClientWithProjectCount extends Client {
  project_count?: number;
}

// Client con proyectos expandidos
export interface ClientWithProjects extends Client {
  projects?: {
    id: string;
    name: string;
    status: string;
  }[];
}
