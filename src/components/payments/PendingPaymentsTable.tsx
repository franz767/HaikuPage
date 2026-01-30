"use client";

import { useState } from "react";
import { Check, X, Eye, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  usePendingPayments,
  useApprovePayment,
  useRejectPayment,
} from "@/hooks/use-payment-submissions";
import { useCreateNotification } from "@/hooks/use-notifications";
import { getInitials } from "@/types/profile";
import type { PaymentSubmissionWithRelations } from "@/types/payment-submission";

export function PendingPaymentsTable() {
  const { data: pendingPayments = [], isLoading } = usePendingPayments();
  const [selectedSubmission, setSelectedSubmission] =
    useState<PaymentSubmissionWithRelations | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();
  const createNotification = useCreateNotification();

  const handleApprove = async (submission: PaymentSubmissionWithRelations) => {
    setProcessingId(submission.id);

    try {
      await approvePayment.mutateAsync({
        submissionId: submission.id,
        projectId: submission.project_id,
        installmentNumber: submission.installment_number,
      });

      // Notificar al usuario que envio el pago
      await createNotification.mutateAsync({
        user_id: submission.submitted_by,
        type: "payment_approved",
        title: "Pago aprobado",
        message: `Tu pago de la cuota #${submission.installment_number} ha sido aprobado`,
        data: {
          project_id: submission.project_id,
          project_name: submission.project?.name,
          installment_number: submission.installment_number,
          amount: submission.amount,
        },
      });
    } catch (error) {
      console.error("Error al aprobar:", error);
      alert("Error al aprobar: " + (error as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;

    setProcessingId(selectedSubmission.id);

    try {
      await rejectPayment.mutateAsync({
        submissionId: selectedSubmission.id,
        notes: rejectNotes,
      });

      // Notificar al usuario
      await createNotification.mutateAsync({
        user_id: selectedSubmission.submitted_by,
        type: "payment_rejected",
        title: "Pago rechazado",
        message: `Tu pago de la cuota #${selectedSubmission.installment_number} ha sido rechazado${rejectNotes ? `. Motivo: ${rejectNotes}` : ""}`,
        data: {
          project_id: selectedSubmission.project_id,
          project_name: selectedSubmission.project?.name,
          installment_number: selectedSubmission.installment_number,
          amount: selectedSubmission.amount,
          rejection_notes: rejectNotes,
        },
      });

      // Limpiar estado
      setSelectedSubmission(null);
      setRejectNotes("");
      setShowRejectForm(false);
    } catch (error) {
      console.error("Error al rechazar:", error);
      alert("Error al rechazar: " + (error as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (submission: PaymentSubmissionWithRelations) => {
    setSelectedSubmission(submission);
    setRejectNotes("");
    setShowRejectForm(true);
  };

  const closeRejectModal = () => {
    setSelectedSubmission(null);
    setRejectNotes("");
    setShowRejectForm(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Pagos Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (pendingPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Pagos Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay pagos pendientes de revision</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Pagos Pendientes
            <Badge variant="destructive" className="ml-2">
              {pendingPayments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingPayments.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Avatar del usuario */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={submission.submitter?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(submission.submitter?.full_name || "?")}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {submission.submitter?.full_name || "Usuario"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Cuota #{submission.installment_number}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {submission.project?.name}
                    {submission.project?.client?.name && (
                      <span> - {submission.project.client.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(submission.submitted_at).toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Monto */}
                <div className="text-right shrink-0">
                  <p className="font-semibold text-lg">
                    S/{" "}
                    {submission.amount.toLocaleString("es-PE", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Ver comprobante */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(submission.receipt_url, "_blank")}
                    title="Ver comprobante"
                    className="h-9 w-9"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Aprobar */}
                  <Button
                    variant="default"
                    size="icon"
                    className="bg-emerald-600 hover:bg-emerald-700 h-9 w-9"
                    onClick={() => handleApprove(submission)}
                    disabled={processingId === submission.id}
                    title="Aprobar pago"
                  >
                    {processingId === submission.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Rechazar */}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => openRejectModal(submission)}
                    disabled={processingId === submission.id}
                    title="Rechazar pago"
                    className="h-9 w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de rechazo */}
      {showRejectForm && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeRejectModal}
          />
          <Card className="relative z-10 w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Rechazar Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Estas rechazando el pago de{" "}
                <strong>
                  S/{" "}
                  {selectedSubmission.amount.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  })}
                </strong>{" "}
                de <strong>{selectedSubmission.submitter?.full_name}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Motivo del rechazo (opcional)
                </label>
                <Textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Ej: Comprobante ilegible, monto incorrecto..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeRejectModal}
                  disabled={processingId === selectedSubmission.id}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={processingId === selectedSubmission.id}
                >
                  {processingId === selectedSubmission.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Rechazando...
                    </>
                  ) : (
                    "Rechazar Pago"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
