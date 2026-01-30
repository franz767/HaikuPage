"use client";

import { useState } from "react";
import { Eye, Loader2, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAllPayments } from "@/hooks/use-payment-submissions";
import { getInitials } from "@/types/profile";
import type { PaymentSubmissionWithRelations } from "@/types/payment-submission";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const statusConfig = {
  pending: {
    label: "Pendiente",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-amber-600",
  },
  approved: {
    label: "Aprobado",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-emerald-600",
  },
  rejected: {
    label: "Rechazado",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-600",
  },
};

export function AllPaymentsTable() {
  const { data: allPayments = [], isLoading } = useAllPayments();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Filtrar pagos por estado
  const filteredPayments =
    statusFilter === "all"
      ? allPayments
      : allPayments.filter((p) => p.status === statusFilter);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (allPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay registros de pagos</p>
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
            Historial de Pagos
            <Badge variant="outline" className="ml-2">
              {filteredPayments.length}
            </Badge>
          </CardTitle>

          {/* Filtro por estado */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
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
                <TableHead>Colaborador</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="w-[80px] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment, index) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  rowNumber={index + 1}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentRow({
  payment,
  rowNumber,
}: {
  payment: PaymentSubmissionWithRelations;
  rowNumber: number;
}) {
  const status = statusConfig[payment.status];
  const StatusIcon = status.icon;

  return (
    <TableRow>
      {/* N° */}
      <TableCell className="font-medium text-muted-foreground">
        {rowNumber}
      </TableCell>

      {/* Colaborador */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={payment.submitter?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(payment.submitter?.full_name || "?")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">
            {payment.submitter?.full_name || "Usuario"}
          </span>
        </div>
      </TableCell>

      {/* Proyecto */}
      <TableCell>
        <div>
          <span className="font-medium text-sm">{payment.project?.name}</span>
          {payment.project?.client?.name && (
            <p className="text-xs text-muted-foreground">
              {payment.project.client.name}
            </p>
          )}
        </div>
      </TableCell>

      {/* Monto */}
      <TableCell className="text-right font-semibold">
        S/{" "}
        {payment.amount.toLocaleString("es-PE", {
          minimumFractionDigits: 2,
        })}
      </TableCell>

      {/* Fecha */}
      <TableCell>
        <div className="text-sm">
          {new Date(payment.submitted_at).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(payment.submitted_at).toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </TableCell>

      {/* Estatus */}
      <TableCell>
        <Badge variant={status.variant} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </TableCell>

      {/* Acciones */}
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.open(payment.receipt_url, "_blank")}
          title="Ver comprobante"
          className="h-8 w-8"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
