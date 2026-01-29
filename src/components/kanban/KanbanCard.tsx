"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, Edit2, Calendar, CheckSquare, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeleteTask } from "@/hooks/use-tasks";
import { useChecklists, useAttachments } from "@/hooks/use-task-extras";
import type { Task } from "@/types/task";
import { TaskDetailModal } from "./TaskDetailModal";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
    task: Task;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
    isAdmin?: boolean;
}

export function KanbanCard({ task, onDragStart, isAdmin }: KanbanCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const deleteTask = useDeleteTask();

    // Obtener datos de checklists y adjuntos para mostrar indicadores
    const { data: checklists = [] } = useChecklists(task.id);
    const { data: attachments = [] } = useAttachments(task.id);

    // Calcular progreso del checklist
    const allItems = checklists.flatMap(c => c.items || []);
    const completedItems = allItems.filter(i => i.is_completed);
    const hasChecklist = allItems.length > 0;
    const checklistProgress = hasChecklist ? `${completedItems.length}/${allItems.length}` : null;

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

    return (
        <>
            <Card
                draggable
                onDragStart={(e) => onDragStart(e, task.id)}
                onClick={handleCardClick}
                className={cn(
                    "cursor-pointer bg-background shadow-sm hover:shadow-md transition-shadow group",
                    "border-l-4 hover:ring-2 hover:ring-primary/20"
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
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">
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
                    {(hasDueDate || hasChecklist || attachments.length > 0) && (
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
                                        completedItems.length === allItems.length && allItems.length > 0
                                            ? "bg-green-100 text-green-700"
                                            : "bg-muted"
                                    )}
                                >
                                    <CheckSquare className="h-3 w-3" />
                                    <span>{checklistProgress}</span>
                                </div>
                            )}

                            {/* Attachments Count */}
                            {attachments.length > 0 && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                                    <Paperclip className="h-3 w-3" />
                                    <span>{attachments.length}</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Task Detail Modal */}
            <TaskDetailModal
                task={task}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                isAdmin={isAdmin}
            />
        </>
    );
}
