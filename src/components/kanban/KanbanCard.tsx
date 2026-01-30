"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Trash2, Edit2, Calendar, CheckSquare, Paperclip, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import type { Task } from "@/types/task";
import { TaskDetailModal } from "./TaskDetailModal";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
    task: Task;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
    onDragEnd?: () => void;
    isAdmin?: boolean;
}

export function KanbanCard({ task, onDragStart, onDragEnd, isAdmin }: KanbanCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const deleteTask = useDeleteTask();
    const updateTask = useUpdateTask();

    // ✅ OPTIMIZACIÓN: Usar contadores desnormalizados de la tarea
    // Ya no hacemos queries individuales por cada tarjeta
    const checklistTotal = task.checklist_total ?? 0;
    const checklistCompleted = task.checklist_completed ?? 0;
    const attachmentsCount = task.attachments_count ?? 0;
    const commentsCount = task.comments_count ?? 0;

    const hasChecklist = checklistTotal > 0;
    const checklistProgress = hasChecklist ? `${checklistCompleted}/${checklistTotal}` : null;

    // Verificar si tiene fecha de vencimiento
    const hasDueDate = !!task.due_date;
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date();
    const isDueSoon = dueDate && !isOverdue && (dueDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

    const handleDelete = async () => {
        if (!confirm("¿Eliminar esta tarjeta?")) return;
        await deleteTask.mutateAsync({
            id: task.id,
            projectId: task.project_id,
        });
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        setShowModal(true);
    };

    const formatDueDate = (date: Date) => {
        const day = date.getDate();
        const month = date.toLocaleDateString("es-ES", { month: "short" });
        return `${day} ${month}`;
    };

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        onDragStart(e, task.id);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        onDragEnd?.();
    };

    return (
        <>
            <motion.div
                layout
                layoutId={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: isDragging ? 1.02 : 1,
                    boxShadow: isDragging
                        ? "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                        : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                    rotate: isDragging ? 2 : 0,
                }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{
                    layout: { type: "spring", stiffness: 350, damping: 30 },
                    opacity: { duration: 0.2 },
                    scale: { type: "spring", stiffness: 400, damping: 25 },
                    rotate: { type: "spring", stiffness: 400, damping: 25 },
                }}
                whileHover={{ y: -2 }}
            >
                <Card
                    draggable
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onClick={handleCardClick}
                    className={cn(
                        "cursor-pointer bg-background hover:shadow-md transition-colors group",
                        "border-l-4 hover:ring-2 hover:ring-primary/20",
                        isDragging && "opacity-90"
                    )}
                    style={{
                        borderLeftColor: task.label_color || "transparent",
                    }}
                >
                    <CardContent className="p-3">
                        {/* Label */}
                        {task.label_text && (
                            <div
                                className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white mb-2"
                                style={{ backgroundColor: task.label_color || "#3b82f6" }}
                            >
                                {task.label_text}
                            </div>
                        )}

                        {/* Title & Menu */}
                        <div className="flex items-start justify-between gap-2 relative">
                            <div className="flex-1 min-w-0 flex items-start gap-2">
                                {/* Completed Check - Clickable */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateTask.mutate({ id: task.id, is_completed: !task.is_completed });
                                    }}
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                        task.is_completed
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "border-muted-foreground/40 hover:border-green-500 hover:bg-green-50"
                                    )}
                                    title={task.is_completed ? "Marcar como pendiente" : "Marcar como completada"}
                                >
                                    {task.is_completed && (
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    )}
                                </button>
                                <p className={cn(
                                    "text-sm font-medium leading-snug",
                                    task.is_completed && "line-through text-muted-foreground"
                                )}>
                                    {task.title}
                                </p>
                                {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {task.description}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>

                            {showMenu && (
                                <div className="absolute right-0 top-6 z-10 bg-background border rounded-md shadow-lg py-1 min-w-[120px]">
                                    <button
                                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(false);
                                            setShowModal(true);
                                        }}
                                    >
                                        <Edit2 className="h-3 w-3" />
                                        Editar
                                    </button>
                                    {isAdmin && (
                                        <button
                                            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(false);
                                                handleDelete();
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Indicators Row */}
                        {(hasDueDate || hasChecklist || attachmentsCount > 0 || commentsCount > 0) && (
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                                {/* Due Date */}
                                {hasDueDate && dueDate && (
                                    <div
                                        className={cn(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded",
                                            isOverdue && "bg-red-100 text-red-700",
                                            isDueSoon && !isOverdue && "bg-yellow-100 text-yellow-700",
                                            !isOverdue && !isDueSoon && "bg-muted"
                                        )}
                                    >
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatDueDate(dueDate)}</span>
                                    </div>
                                )}

                                {/* Checklist Progress */}
                                {hasChecklist && (
                                    <div
                                        className={cn(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded",
                                            checklistCompleted === checklistTotal && checklistTotal > 0
                                                ? "bg-green-100 text-green-700"
                                                : "bg-muted"
                                        )}
                                    >
                                        <CheckSquare className="h-3 w-3" />
                                        <span>{checklistProgress}</span>
                                    </div>
                                )}

                                {/* Attachments Count */}
                                {attachmentsCount > 0 && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                                        <Paperclip className="h-3 w-3" />
                                        <span>{attachmentsCount}</span>
                                    </div>
                                )}

                                {/* Comments Count */}
                                {commentsCount > 0 && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                                        <MessageSquare className="h-3 w-3" />
                                        <span>{commentsCount}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Task Detail Modal - Solo se renderiza cuando está abierto para evitar queries innecesarias */}
            {showModal && (
                <TaskDetailModal
                    task={task}
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    isAdmin={isAdmin}
                />
            )}
        </>
    );
}
