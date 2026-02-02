"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  Transaction,
  TransactionType,
  FinancialDataPoint,
  FinancialSummary,
} from "@/types/transaction";

// ==============================================
// Query Keys
// ==============================================

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...transactionKeys.lists(), filters] as const,
  summary: (period: string) =>
    [...transactionKeys.all, "summary", period] as const,
  chart: (months: number) =>
    [...transactionKeys.all, "chart", months] as const,
};

// ==============================================
// Fetchers
// ==============================================

async function fetchTransactions(
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  const supabase = createClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchFinancialChartData(
  months: number = 6
): Promise<FinancialDataPoint[]> {
  const supabase = createClient();

  // Calcular fecha de inicio (hace X meses)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Agrupar por mes
  const monthlyData: Record<string, { income: number; expense: number }> = {};

  (data ?? []).forEach((t) => {
    const monthKey = t.date.slice(0, 7); // "2025-01"
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === "income") {
      monthlyData[monthKey].income += Number(t.amount);
    } else {
      monthlyData[monthKey].expense += Number(t.amount);
    }
  });

  // Convertir a formato de grafico
  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [year, month] = key.split("-");
      return {
        date: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        income: value.income,
        expense: value.expense,
        net: value.income - value.expense,
      };
    });
}

function calculateSummary(transactions: Transaction[]): FinancialSummary {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    trend: 0, // Se calcula comparando con periodo anterior
    transactionCount: transactions.length,
  };
}

// ==============================================
// Hooks (SOLO PARA ADMIN - RLS bloquea para users)
// ==============================================

/**
 * Hook para obtener transacciones con filtros opcionales
 */
export function useTransactions(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: transactionKeys.list({ startDate, endDate }),
    queryFn: () => fetchTransactions(startDate, endDate),
  });
}

/**
 * Hook para obtener datos de grafico financiero
 */
export function useFinancialChartData(months: number = 6) {
  return useQuery({
    queryKey: transactionKeys.chart(months),
    queryFn: () => fetchFinancialChartData(months),
  });
}

/**
 * Hook para obtener resumen financiero
 */
export function useFinancialSummary(startDate?: string, endDate?: string) {
  const { data: transactions, ...rest } = useTransactions(startDate, endDate);

  return {
    ...rest,
    data: transactions ? calculateSummary(transactions) : undefined,
  };
}

/**
 * Hook para subir comprobante de transaccion a Storage
 */
export function useUploadTransactionReceipt() {
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
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
      const filePath = `transactions/${fileName}`;

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
 * Hook para crear una transaccion (solo admin)
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: {
      amount: number;
      type: TransactionType;
      category: string;
      description?: string;
      project_id?: string;
      date?: string;
      status?: "approved" | "pending";
      receipt_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          amount: input.amount,
          type: input.type,
          category: input.category,
          description: input.description,
          project_id: input.project_id,
          date: input.date ?? new Date().toISOString().split("T")[0],
          status: input.status ?? "approved",
          receipt_url: input.receipt_url,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/**
 * Hook para eliminar una transaccion (solo admin)
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
