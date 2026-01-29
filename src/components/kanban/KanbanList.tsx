"use client";

import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTask } from "@/hooks/use-tasks";
import type { Task, TaskStatus } from "@/types/task";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";

interface KanbanListProps {
    column: {
        id: TaskStatus;
        title: string;
        icon: string;
        color: string;
    };
    tasks: Task[];
    projectId: string;
    isAdmin?: boolean;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, columnId: TaskStatus) => void;
}

export function KanbanList({
    column,
    tasks,
    projectId,
    isAdmin,
    onDragStart,
    onDragOver,
    onDrop,
}: KanbanListProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const createTask = useCreateTask();

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;

        await createTask.mutateAsync({
            project_id: projectId,
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim() || null,
            status: column.id,
        });

        setNewTaskTitle("");
        setNewTaskDescription("");
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddTask();
        } else if (e.key === "Escape") {
            setIsAdding(false);
            setNewTaskTitle("");
            setNewTaskDescription("");
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setNewTaskTitle("");
        setNewTaskDescription("");
    };

    return (
        <div
            className={cn(
                "w-72 shrink-0 rounded-xl p-3 flex flex-col max-h-[calc(100vh-300px)]",
                column.color
            )}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, column.id)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{column.icon}</span>
                    <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
                    <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {tasks.map((task) => (
                    <KanbanCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>

            {/* Add Task */}
            {isAdding ? (
                <div className="mt-2 space-y-2 bg-background rounded-lg p-3 shadow-sm border">
                    <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Título de la tarjeta..."
                        autoFocus
                        className="text-sm"
                    />
                    <Textarea
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        placeholder="Descripción (opcional)..."
                        className="text-sm min-h-[60px] resize-none"
                        rows={2}
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={handleAddTask}
                            disabled={createTask.isPending || !newTaskTitle.trim()}
                        >
                            {createTask.isPending ? "Añadiendo..." : "Añadir"}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    variant="ghost"
                    className="mt-2 justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir una tarjeta
                </Button>
            )}
        </div>
    );
}
