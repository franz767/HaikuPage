"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  PaymentSubmission,
  PaymentSubmissionWithRelations,
  PaymentSubmissionInsert,
} from "@/types/payment-submission";

// ==============================================
// Query Keys
// ==============================================

export const paymentSubmissionKeys = {
  all: ["payment-submissions"] as const,
  lists: () => [...paymentSubmissionKeys.all, "list"] as const,
  allPayments: () => [...paymentSubmissionKeys.lists(), "all"] as const,
  pending: () => [...paymentSubmissionKeys.lists(), "pending"] as const,
  byProject: (projectId: string) =>
    [...paymentSubmissionKeys.lists(), "project", projectId] as const,
  detail: (id: string) => [...paymentSubmissionKeys.all, "detail", id] as const,
};

// ==============================================
// Fetchers
// ==============================================

async function fetchAllSubmissions(): Promise<PaymentSubmissionWithRelations[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payment_submissions")
    .select(
      `
      *,
      submitter:profiles!payment_submissions_submitted_by_fkey(id, full_name, avatar_url),
      project:projects!payment_submissions_project_id_fkey(id, name, client:clients(name)),
      reviewer:profiles!payment_submissions_reviewed_by_fkey(id, full_name)
    `
    )
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentSubmissionWithRelations[];
}

async function fetchPendingSubmissions(): Promise<PaymentSubmissionWithRelations[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payment_submissions")
    .select(
      `
      *,
      submitter:profiles!payment_submissions_submitted_by_fkey(id, full_name, avatar_url),
      project:projects!payment_submissions_project_id_fkey(id, name, client:clients(name))
    `
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentSubmissionWithRelations[];
}

async function fetchSubmissionsByProject(
  projectId: string
): Promise<PaymentSubmissionWithRelations[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payment_submissions")
    .select(
      `
      *,
      submitter:profiles!payment_submissions_submitted_by_fkey(id, full_name, avatar_url),
      reviewer:profiles!payment_submissions_reviewed_by_fkey(id, full_name)
    `
    )
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentSubmissionWithRelations[];
}

// ==============================================
// Hooks de Consulta
// ==============================================

/**
 * Hook para obtener TODOS los pagos (admin)
 */
export function useAllPayments() {
  return useQuery({
    queryKey: paymentSubmissionKeys.allPayments(),
    queryFn: fetchAllSubmissions,
    staleTime: 30000,
  });
}

/**
 * Hook para obtener pagos pendientes de aprobacion (solo admin)
 */
export function usePendingPayments() {
  return useQuery({
    queryKey: paymentSubmissionKeys.pending(),
    queryFn: fetchPendingSubmissions,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refrescar cada minuto
  });
}

/**
 * Hook para obtener todas las solicitudes de pago de un proyecto
 */
export function useProjectPayments(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: paymentSubmissionKeys.byProject(projectId),
    queryFn: () => fetchSubmissionsByProject(projectId),
    enabled: !!projectId && enabled,
    staleTime: 30000,
  });
}

// ==============================================
// Hooks de Mutacion
// ==============================================

/**
 * Hook para subir comprobante de pago a Storage
 */
export function useUploadPaymentReceipt() {
  return useMutation({
    mutationFn: async ({
      projectId,
      installmentNumber,
      file,
    }: {
      projectId: string;
      installmentNumber: number;
      file: File;
    }) => {
      const supabase = createClient();

      // Validar tamano (10MB max)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error("El archivo excede el tamano maximo de 10MB");
      }

      // Validar tipo de archivo
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipo de archivo no permitido. Use JPG, PNG, GIF, WebP o PDF");
      }

      // Limpiar nombre de archivo
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${Date.now()}_${cleanFileName}`;
      const filePath = `${projectId}/cuota_${installmentNumber}/${fileName}`;

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL publica
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);

      return publicUrl;
    },
  });
}

/**
 * Hook para crear una solicitud de pago
 */
export function useCreatePaymentSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PaymentSubmissionInsert) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("payment_submissions")
        .insert({
          ...input,
          submitted_by: user.id,
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PaymentSubmission;
    },
    onSuccess: (data) => {
      // Invalidar listas relacionadas
      queryClient.invalidateQueries({
        queryKey: paymentSubmissionKeys.byProject(data.project_id),
      });
      queryClient.invalidateQueries({
        queryKey: paymentSubmissionKeys.pending(),
      });
    },
  });
}

/**
 * Hook para aprobar un pago (admin)
 * Actualiza el estado de la solicitud Y marca la cuota como pagada en el proyecto
 */
export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      projectId,
      installmentNumber,
    }: {
      submissionId: string;
      projectId: string;
      installmentNumber: number;
    }) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Actualizar el estado de la solicitud
      const { error: submissionError } = await supabase
        .from("payment_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as never)
        .eq("id", submissionId);

      if (submissionError) throw new Error(submissionError.message);

      // 2. Obtener metadata actual del proyecto
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("metadata")
        .eq("id", projectId)
        .single();

      if (projectError) throw new Error(projectError.message);

      // 3. Actualizar la cuota como pagada
      const metadata = ((project as { metadata?: Record<string, unknown> })?.metadata as Record<string, unknown>) || {};
      const installments =
        (metadata.payment_installments as Array<{
          number: number;
          amount: number;
          date: string;
          paid: boolean;
          paid_at?: string;
        }>) || [];

      const updatedInstallments = installments.map((inst) =>
        inst.number === installmentNumber
          ? { ...inst, paid: true, paid_at: new Date().toISOString() }
          : inst
      );

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          metadata: {
            ...metadata,
            payment_installments: updatedInstallments,
          },
        } as never)
        .eq("id", projectId);

      if (updateError) throw new Error(updateError.message);

      return { submissionId, projectId, installmentNumber };
    },
    onSuccess: (data) => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({
        queryKey: paymentSubmissionKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", "detail", data.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
    },
  });
}

/**
 * Hook para rechazar un pago (admin)
 */
export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      notes,
    }: {
      submissionId: string;
      notes?: string;
    }) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("payment_submissions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: notes || null,
        } as never)
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PaymentSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentSubmissionKeys.all,
      });
    },
  });
}
