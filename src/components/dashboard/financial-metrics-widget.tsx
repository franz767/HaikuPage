"use client";

import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import type { FinancialDataPoint } from "@/types/transaction";

interface FinancialMetricsWidgetProps {
    transactions: { amount: number; type: string; date: string }[];
    payments: { amount: number; submitted_at: string; reviewed_at: string | null; status: string }[];
    className?: string; // Para estilos extra
}

export function FinancialMetricsWidget({ transactions, payments, className }: FinancialMetricsWidgetProps) {
    const [timeRange, setTimeRange] = useState("30days");

    // Calcular meses disponibles en los datos
    const availableMonths = useMemo(() => {
        const months = new Set<string>();

        // De transacciones
        transactions.forEach(t => {
            if (t.date) months.add(t.date.slice(0, 7)); // YYYY-MM
        });

        // De pagos
        payments.forEach(p => {
            const date = p.reviewed_at || p.submitted_at;
            if (date) months.add(date.slice(0, 7));
        });

        return Array.from(months).sort((a, b) => b.localeCompare(a)); // Descendente
    }, [transactions, payments]);

    // Crear datos del grafico combinando transacciones + pagos aprobados
    const chartData = useMemo(() => {
        const dailyData: Record<string, { income: number; expense: number }> = {};
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        let startDateStr = "";
        let endDateStr = "";

        // Determinar rango de fechas según filtro
        if (timeRange === "30days") {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);
            startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
            endDateStr = today.toISOString().split('T')[0];
        } else {
            // Es un mes específico (YYYY-MM)
            const [year, month] = timeRange.split("-");
            // start date is first day of month
            startDateStr = timeRange + "-01";

            // end date is last day of month
            const lastDay = new Date(parseInt(year), parseInt(month), 0);
            endDateStr = lastDay.toISOString().split('T')[0];
        }

        // 1. Inicializar días con ceros para el rango seleccionado
        // Esto asegura que el gráfico sea continuo
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        // Ajuste zona horaria simple
        start.setHours(12);
        end.setHours(12);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayKey = d.toISOString().split('T')[0];
            dailyData[dayKey] = { income: 0, expense: 0 };
        }

        // 2. Agregar transacciones (solo del rango)
        transactions.forEach((t) => {
            const transactionDate = t.date;
            if (transactionDate >= startDateStr && transactionDate <= endDateStr && dailyData[transactionDate]) {
                if (t.type === "income") {
                    dailyData[transactionDate].income += Number(t.amount);
                } else {
                    dailyData[transactionDate].expense += Number(t.amount);
                }
            }
        });

        // 3. Agregar pagos de cuotas aprobados como ingresos
        payments
            .filter((p) => p.status === "approved")
            .forEach((p) => {
                const dateStr = (p.reviewed_at || p.submitted_at).split('T')[0];
                if (dateStr >= startDateStr && dateStr <= endDateStr && dailyData[dateStr]) {
                    dailyData[dateStr].income += Number(p.amount);
                }
            });

        // 4. Convertir a formato de grafico y ordenar
        return Object.entries(dailyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                const [year, month, day] = key.split("-");
                return {
                    date: `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`,
                    income: value.income,
                    expense: value.expense,
                    net: value.income - value.expense,
                };
            });
    }, [transactions, payments, timeRange]);

    // Helper para mostrar nombre del mes en el Select
    const formatMonthLabel = (yyyy_mm: string) => {
        const [year, month] = yyyy_mm.split("-");
        const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return `${names[parseInt(month) - 1]} ${year}`;
    };

    return (
        <FinancialOverview
            data={chartData}
            className={className}
            headerActions={
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[160px] h-8 text-xs border-muted-foreground/20">
                        <CalendarRange className="mr-2 h-3 w-3 opacity-50" />
                        <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30days">Últimos 30 días</SelectItem>
                        {availableMonths.map(month => (
                            <SelectItem key={month} value={month}>{formatMonthLabel(month)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            }
        />
    );
}
