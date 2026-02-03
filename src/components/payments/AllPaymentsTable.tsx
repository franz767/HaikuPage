"use client";

import { useState, useMemo } from "react";
import {
  Eye,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Receipt,
  Trash2,
  Download,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllPayments, useDeletePaymentSubmission } from "@/hooks/use-payment-submissions";
import { useTransactions, useDeleteTransaction } from "@/hooks/use-transactions";
import { getInitials } from "@/types/profile";
import type { PaymentSubmissionWithRelations } from "@/types/payment-submission";
import type { Transaction } from "@/types/transaction";

type TypeFilter = "all" | "payment" | "income" | "expense";

// Tipo unificado para la tabla
interface UnifiedRecord {
  id: string;
  type: "payment" | "income" | "expense";
  typeLabel: string;
  description: string;
  amount: number;
  date: Date;
  status?: "pending" | "approved" | "rejected";
  submitter?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  receiptUrl?: string;
  projectName?: string;
  clientName?: string;
}

const statusConfig = {
  pending: {
    label: "Pendiente",
    icon: Clock,
    variant: "secondary" as const,
  },
  approved: {
    label: "Aprobado",
    icon: CheckCircle,
    variant: "default" as const,
  },
  rejected: {
    label: "Rechazado",
    icon: XCircle,
    variant: "destructive" as const,
  },
};

const ITEMS_PER_PAGE = 10;

export function AllPaymentsTable() {
  const { data: allPayments = [], isLoading: paymentsLoading } = useAllPayments();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const deletePayment = useDeletePaymentSubmission();
  const deleteTransaction = useDeleteTransaction();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    record: UnifiedRecord;
  } | null>(null);

  const isLoading = paymentsLoading || transactionsLoading;
  const isDeleting = deletePayment.isPending || deleteTransaction.isPending;

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.record.type === "payment") {
        await deletePayment.mutateAsync(deleteConfirm.record.id);
      } else {
        await deleteTransaction.mutateAsync(deleteConfirm.record.id);
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  // Unificar pagos y transacciones en un formato común
  const unifiedRecords = useMemo(() => {
    const records: UnifiedRecord[] = [];

    // Agregar pagos de cuotas
    allPayments.forEach((payment: PaymentSubmissionWithRelations) => {
      records.push({
        id: payment.id,
        type: "payment",
        typeLabel: `Pago cuota ${payment.installment_number}`,
        description: payment.project?.name || "Proyecto",
        amount: payment.amount,
        date: new Date(payment.submitted_at),
        status: payment.status,
        submitter: payment.submitter,
        receiptUrl: payment.receipt_url,
        projectName: payment.project?.name,
        clientName: payment.project?.client?.name,
      });
    });

    // Agregar transacciones (ingresos y gastos)
    transactions.forEach((transaction: Transaction) => {
      // Parsear fecha como local (evita bug de timezone con UTC)
      const [year, month, day] = transaction.date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);

      records.push({
        id: transaction.id,
        type: transaction.type as "income" | "expense",
        typeLabel: transaction.type === "income" ? "Ingreso" : "Gasto",
        description: transaction.description || transaction.category,
        amount: Number(transaction.amount),
        date: localDate,
        status: (transaction.status as "approved" | "pending") || "approved",
        submitter: null,
        receiptUrl: transaction.receipt_url || undefined,
        projectName: transaction.category,
      });
    });

    // Ordenar por fecha descendente
    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allPayments, transactions]);

  // Filtrar por tipo
  const filteredRecords = useMemo(() => {
    if (typeFilter === "all") return unifiedRecords;
    return unifiedRecords.filter((r) => r.type === typeFilter);
  }, [unifiedRecords, typeFilter]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Resetear página cuando cambia el filtro
  const handleFilterChange = (value: TypeFilter) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (unifiedRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay registros de movimientos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Historial de Movimientos
            <Badge variant="outline" className="ml-2">
              {filteredRecords.length}
            </Badge>
          </CardTitle>

          {/* Filtro por tipo */}
          <Select
            value={typeFilter}
            onValueChange={(v) => handleFilterChange(v as TypeFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="payment">Pagos de cuotas</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
              <SelectItem value="expense">Gastos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">N°</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="w-[100px] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record, index) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  rowNumber={startIndex + index + 1}
                  onViewReceipt={(url, title) => setSelectedReceipt({ url, title })}
                  onDelete={() => setDeleteConfirm({ record })}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentPage}</span>
              <span>de</span>
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal para ver comprobante */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedReceipt?.title || "Comprobante"}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReceipt && window.open(selectedReceipt.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={selectedReceipt?.url} download>
                    <Download className="h-4 w-4 mr-1" />
                    Descargar
                  </a>
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto bg-muted/30 rounded-lg p-4 min-h-[400px]">
            {selectedReceipt?.url && (
              selectedReceipt.url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={selectedReceipt.url}
                  className="w-full h-[500px] rounded border"
                  title="Comprobante PDF"
                />
              ) : (
                <img
                  src={selectedReceipt.url}
                  alt="Comprobante"
                  className="max-w-full max-h-[500px] object-contain rounded shadow-lg"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminacion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Estas seguro de que deseas eliminar este registro?
            </p>
            {deleteConfirm && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="font-medium text-sm">{deleteConfirm.record.typeLabel}</p>
                <p className="text-sm text-muted-foreground">{deleteConfirm.record.description}</p>
                <p className="text-sm font-semibold mt-1">
                  S/ {deleteConfirm.record.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <p className="text-xs text-destructive mt-3">
              Esta accion no se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              No, cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Si, eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RecordRow({
  record,
  rowNumber,
  onViewReceipt,
  onDelete,
}: {
  record: UnifiedRecord;
  rowNumber: number;
  onViewReceipt: (url: string, title: string) => void;
  onDelete: () => void;
}) {
  // Icono y color según el tipo
  const getTypeIcon = () => {
    switch (record.type) {
      case "payment":
        return <Receipt className="h-4 w-4 text-blue-600" />;
      case "income":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "expense":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  const getTypeBadgeVariant = () => {
    switch (record.type) {
      case "payment":
        return "outline";
      case "income":
        return "default";
      case "expense":
        return "destructive";
    }
  };

  const status = record.status ? statusConfig[record.status] : null;
  const StatusIcon = status?.icon;

  return (
    <TableRow>
      {/* N° */}
      <TableCell className="font-medium text-muted-foreground">
        {rowNumber}
      </TableCell>

      {/* Tipo */}
      <TableCell>
        <div className="flex items-center gap-2">
          {getTypeIcon()}
          <Badge variant={getTypeBadgeVariant() as "outline" | "default" | "destructive"} className="text-xs">
            {record.typeLabel}
          </Badge>
        </div>
      </TableCell>

      {/* Descripción */}
      <TableCell>
        <div>
          <span className="font-medium text-sm">{record.description}</span>
          {record.clientName && (
            <p className="text-xs text-muted-foreground">{record.clientName}</p>
          )}
          {record.submitter?.full_name && (
            <div className="flex items-center gap-1.5 mt-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={record.submitter.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(record.submitter.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {record.submitter.full_name}
              </span>
            </div>
          )}
        </div>
      </TableCell>

      {/* Monto */}
      <TableCell className="text-right">
        <span
          className={`font-semibold ${
            record.status === "rejected" ? "text-muted-foreground" :
            record.type === "expense" ? "text-red-500" :
            (record.type === "income" || (record.type === "payment" && record.status === "approved")) ? "text-emerald-600" :
            record.type === "payment" ? "text-blue-600" : ""
          }`}
        >
          {record.status === "rejected" ? "" :
           record.type === "expense" ? "- " :
           (record.type === "income" || (record.type === "payment" && record.status === "approved")) ? "+ " : ""}
          S/{" "}
          {record.amount.toLocaleString("es-PE", {
            minimumFractionDigits: 2,
          })}
        </span>
      </TableCell>

      {/* Fecha */}
      <TableCell>
        <div className="text-sm">
          {record.date.toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
        {record.type === "payment" && (
          <div className="text-xs text-muted-foreground">
            {record.date.toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </TableCell>

      {/* Estatus */}
      <TableCell>
        {status && StatusIcon && (
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        )}
      </TableCell>

      {/* Acciones */}
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          {record.receiptUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewReceipt(
                record.receiptUrl!,
                `Comprobante - ${record.typeLabel} - ${record.description}`
              )}
              title="Ver comprobante"
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Eliminar"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
