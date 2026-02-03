"use client";

import { useCurrentProfile } from "@/hooks/use-profile";
import { isAdmin as checkIsAdmin, isClient as checkIsClient, isCollaborator as checkIsCollaborator } from "@/types/profile";

export function useUserRole() {
    const { data: profile, isLoading, error } = useCurrentProfile();

    return {
        profile,
        isLoading,
        error,
        isAdmin: profile ? checkIsAdmin(profile) : false,
        isClient: profile ? checkIsClient(profile) : false,
        isCollaborator: profile ? checkIsCollaborator(profile) : false,
        role: profile?.role,
        // Helpers específicos de negocio
        canCreateProjects: profile ? checkIsAdmin(profile) : false,
        canDeleteProjects: profile ? checkIsAdmin(profile) : false,
        canViewFinancials: profile ? checkIsAdmin(profile) : false,
    };
}
