import type { Database } from "./database";

// Tipos base de la tabla
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert =
  Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate =
  Database["public"]["Tables"]["transactions"]["Update"];
export type TransactionType = Database["public"]["Enums"]["transaction_type"];

// ==============================================
// Tipos para graficos y reportes
// ==============================================

export interface FinancialDataPoint {
  date: string; // formato: 'Ene 24', 'Feb 24', etc.
  income: number;
  expense: number;
  net: number; // income - expense
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  trend: number; // diferencia con periodo anterior
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  type: TransactionType;
}

// ==============================================
// Constantes de categorias
// ==============================================

export const TRANSACTION_CATEGORIES = {
  income: [
    { value: "Proyecto", label: "Proyecto" },
    { value: "Consultoria", label: "Consultoria" },
    { value: "Mantenimiento", label: "Mantenimiento" },
    { value: "Otro", label: "Otro" },
  ],
  expense: [
    { value: "Software", label: "Software" },
    { value: "Servicios", label: "Servicios" },
    { value: "Freelance", label: "Freelance" },
    { value: "Marketing", label: "Marketing" },
    { value: "Oficina", label: "Oficina" },
    { value: "Otro", label: "Otro" },
  ],
} as const;

// ==============================================
// Utilidades de formato
// ==============================================

export function formatCurrency(
  amount: number,
  currency: string = "EUR"
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  currency: string = "EUR"
): string {
  if (amount >= 1000) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatCurrency(amount, currency);
}
