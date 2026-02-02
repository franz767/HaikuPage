"use client";

import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks, useCreateTask, useMoveTask } from "@/hooks/use-tasks";
import { TASK_COLUMNS, type TaskStatus } from "@/types/task";
import { KanbanList } from "./KanbanList";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
    projectId: string;
    isAdmin?: boolean;
    readOnly?: boolean;
}

export function KanbanBoard({ projectId, isAdmin = false, readOnly = false }: KanbanBoardProps) {
    const { data: tasks, isLoading } = useTasks(projectId);
    const moveTask = useMoveTask();

    // Agrupar tareas por columna
    const tasksByColumn = TASK_COLUMNS.reduce(
        (acc, column) => {
            acc[column.id] = tasks?.filter((t) => t.status === column.id) || [];
            return acc;
        },
        {} as Record<TaskStatus, typeof tasks>
    );

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, columnId: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");

        if (!taskId) return;

        const tasksInColumn = tasksByColumn[columnId] || [];
        const newPosition = tasksInColumn.length;

        moveTask.mutate({
            taskId,
            projectId,
            newStatus: columnId,
            newPosition,
        });
    };

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {TASK_COLUMNS.map((column) => (
                    <div key={column.id} className="w-72 shrink-0">
                        <Skeleton className="h-10 w-full mb-2" />
                        <Skeleton className="h-24 w-full mb-2" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
            {TASK_COLUMNS.map((column) => (
                <KanbanList
                    key={column.id}
                    column={column}
                    tasks={tasksByColumn[column.id] || []}
                    projectId={projectId}
                    isAdmin={isAdmin}
                    readOnly={readOnly}
                    onDragStart={readOnly ? undefined : handleDragStart}
                    onDragOver={readOnly ? undefined : handleDragOver}
                    onDrop={readOnly ? undefined : handleDrop}
                />
            ))}
        </div>
    );
}
