// ==============================================
// Tipos para el sistema de notificaciones
// ==============================================

// Tipos de notificacion disponibles
export type NotificationType =
  | "payment_submitted"        // Para usuario: "Tu pago esta siendo procesado"
  | "payment_pending_review"   // Para admin: "Hay un pago pendiente"
  | "payment_approved"         // Para usuario: "Tu pago fue aprobado"
  | "payment_rejected";        // Para usuario: "Tu pago fue rechazado"

// Tipo base de la tabla
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

// Datos adicionales que puede contener una notificacion
export interface NotificationData {
  project_id?: string;
  project_name?: string;
  submission_id?: string;
  installment_number?: number;
  amount?: number;
  rejection_notes?: string;
  [key: string]: unknown;
}

// Para crear una notificacion
export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
}

// Configuracion de UI por tipo de notificacion
export const NOTIFICATION_CONFIG = {
  payment_submitted: {
    icon: "Clock",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  payment_pending_review: {
    icon: "CreditCard",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  payment_approved: {
    icon: "CheckCircle",
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  payment_rejected: {
    icon: "XCircle",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
  },
} as const;

// Templates para construir mensajes de notificacion
export const NOTIFICATION_TEMPLATES = {
  payment_submitted: {
    title: "Pago en proceso",
    getMessage: (data: NotificationData) =>
      `Tu pago de la cuota #${data.installment_number} esta siendo procesado`,
  },
  payment_pending_review: {
    title: "Pago pendiente de revision",
    getMessage: (data: NotificationData) =>
      `Un pago de S/ ${data.amount?.toLocaleString("es-PE")} para "${data.project_name}" requiere aprobacion`,
  },
  payment_approved: {
    title: "Pago aprobado",
    getMessage: (data: NotificationData) =>
      `Tu pago de la cuota #${data.installment_number} ha sido aprobado`,
  },
  payment_rejected: {
    title: "Pago rechazado",
    getMessage: (data: NotificationData) => {
      let msg = `Tu pago de la cuota #${data.installment_number} ha sido rechazado`;
      if (data.rejection_notes) {
        msg += `. Motivo: ${data.rejection_notes}`;
      }
      return msg;
    },
  },
} as const;

// Helper para crear una notificacion con template
export function createNotificationFromTemplate(
  type: NotificationType,
  userId: string,
  data: NotificationData
): NotificationInsert {
  const template = NOTIFICATION_TEMPLATES[type];
  return {
    user_id: userId,
    type,
    title: template.title,
    message: template.getMessage(data),
    data,
  };
}
