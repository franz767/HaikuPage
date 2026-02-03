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

export function isCollaborator(profile: Profile | null | undefined): boolean {
  return profile?.role === "colaborador";
}

export function isClient(profile: Profile | null | undefined): boolean {
  return profile?.role === "cliente" || profile?.role === "user";
}

export function getInitials(fullName: string | null): string {
  if (!fullName) return "??";
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
  colaborador: { label: "Colaborador", description: "Colaborador interno de la agencia" },
  user: { label: "Cliente", description: "Cliente (rol por defecto)" },
  cliente: { label: "Cliente", description: "Solo puede ver el progreso de sus proyectos" },
} as const;
