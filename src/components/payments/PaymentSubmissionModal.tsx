"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, Image, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreatePaymentSubmission,
  useUploadPaymentReceipt,
} from "@/hooks/use-payment-submissions";
import { useCreateNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { PaymentInstallment } from "@/types/project";

interface PaymentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  installment: PaymentInstallment;
  adminUserIds: string[];
}

export function PaymentSubmissionModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  installment,
  adminUserIds,
}: PaymentSubmissionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadReceipt = useUploadPaymentReceipt();
  const createSubmission = useCreatePaymentSubmission();
  const createNotifications = useCreateNotifications();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);

    // Preview para imagenes
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Subir archivo
      const receiptUrl = await uploadReceipt.mutateAsync({
        projectId,
        installmentNumber: installment.number,
        file,
      });

      // 2. Crear solicitud de pago
      await createSubmission.mutateAsync({
        project_id: projectId,
        installment_number: installment.number,
        amount: installment.amount,
        receipt_url: receiptUrl,
      });

      // 3. Notificar a todos los admins
      if (adminUserIds.length > 0) {
        const notifications = adminUserIds.map((adminId) => ({
          user_id: adminId,
          type: "payment_pending_review" as const,
          title: "Pago pendiente de revision",
          message: `Un pago de S/ ${installment.amount.toLocaleString("es-PE")} para "${projectName}" requiere aprobacion`,
          data: {
            project_id: projectId,
            project_name: projectName,
            installment_number: installment.number,
            amount: installment.amount,
          },
        }));

        await createNotifications.mutateAsync(notifications);
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Error al enviar pago:", err);
      setError((err as Error).message || "Error al enviar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.startsWith("image/")) return <Image className="h-8 w-8 text-muted-foreground" />;
    if (file.type.includes("pdf")) return <FileText className="h-8 w-8 text-muted-foreground" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Registrar Pago</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {isSuccess ? (
            // Estado de exito
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-700 mb-2">
                SU PAGO ESTA SIENDO PROCESADO
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Te notificaremos cuando sea aprobado por un administrador.
              </p>
              <Button onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              {/* Info de la cuota */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Cuota #{installment.number}
                  </span>
                  <span className="font-semibold text-lg">
                    S/{" "}
                    {installment.amount.toLocaleString("es-PE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Fecha de registro</span>
                  <span className="font-medium">{today}</span>
                </div>
              </div>

              {/* Upload de comprobante */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Comprobante de pago <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!file ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click para subir imagen</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF, WebP o PDF (max 10MB)
                    </p>
                  </button>
                ) : (
                  <div className="border rounded-lg p-4">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg mb-3 object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center py-4 mb-3">
                        {getFileIcon()}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Boton de envio */}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!file || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Registrar Pago"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                El pago sera revisado y aprobado por un administrador
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
