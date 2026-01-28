import type { Database } from "./database";

// Tipos base
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type UserRole = Database["public"]["Enums"]["user_role"];

// Profile con datos de auth
export interface ProfileWithAuth extends Profile {
  email?: string;
}

// ==============================================
// Type guards y utilidades
// ==============================================

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

export function isUser(profile: Profile | null | undefined): boolean {
  return profile?.role === "user";
}

export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ==============================================
// Constantes
// ==============================================

export const USER_ROLES = {
  admin: { label: "Administrador", description: "Acceso total al sistema" },
  user: { label: "Colaborador", description: "Acceso limitado a proyectos asignados" },
} as const;
