// ==============================================
// Tipos para solicitudes de pago de cuotas
// ==============================================

// Estados de solicitud de pago
export type PaymentSubmissionStatus = "pending" | "approved" | "rejected";

// Tipo base de la tabla
export interface PaymentSubmission {
  id: string;
  project_id: string;
  installment_number: number;
  amount: number;
  receipt_url: string;
  submitted_by: string;
  status: PaymentSubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Con relaciones (para mostrar en UI)
export interface PaymentSubmissionWithRelations extends PaymentSubmission {
  submitter?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reviewer?: {
    id: string;
    full_name: string;
  } | null;
  project?: {
    id: string;
    name: string;
    client?: {
      name: string;
    } | null;
  };
}

// Para crear una nueva solicitud
export interface PaymentSubmissionInsert {
  project_id: string;
  installment_number: number;
  amount: number;
  receipt_url: string;
}

// Constantes de estados con metadata para UI
export const PAYMENT_SUBMISSION_STATUS = {
  pending: {
    label: "Pendiente",
    description: "Esperando revision del administrador",
    color: "warning" as const,
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  approved: {
    label: "Aprobado",
    description: "El pago ha sido verificado y aprobado",
    color: "success" as const,
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
  },
  rejected: {
    label: "Rechazado",
    description: "El pago fue rechazado",
    color: "destructive" as const,
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
  },
} as const;

// Helper para obtener el label de un estado
export function getStatusLabel(status: PaymentSubmissionStatus): string {
  return PAYMENT_SUBMISSION_STATUS[status].label;
}

// Helper para obtener las clases de color de un estado
export function getStatusColors(status: PaymentSubmissionStatus) {
  return PAYMENT_SUBMISSION_STATUS[status];
}
