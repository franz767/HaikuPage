"use client";

import { useState, useEffect, useRef } from "react";
import {
    X, Calendar, CheckSquare, Users, Paperclip, Plus, MessageSquare, Clock,
    Trash2, FileText, Image, File, ChevronLeft, ChevronRight, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateTask } from "@/hooks/use-tasks";
import {
    useChecklists, useCreateChecklist, useDeleteChecklist,
    useCreateChecklistItem, useToggleChecklistItem, useDeleteChecklistItem,
    useAttachments, useUploadAttachment, useDeleteAttachment,
    useComments, useCreateComment, useDeleteComment, useUpdateComment, useActivities
} from "@/hooks/use-task-extras";
import { TASK_COLUMNS, LABEL_COLORS, type Task, type TaskStatus, type TaskAttachment } from "@/types/task";
import { cn } from "@/lib/utils";
import { FilePreviewModal } from "./FilePreviewModal";

interface TaskDetailModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean;
}

export function TaskDetailModal({ task, isOpen, onClose, isAdmin }: TaskDetailModalProps) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showLabelMenu, setShowLabelMenu] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showChecklistForm, setShowChecklistForm] = useState(false);
    const [labelColor, setLabelColor] = useState(task.label_color || "");
    const [labelText, setLabelText] = useState(task.label_text || "");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [newChecklistTitle, setNewChecklistTitle] = useState("Checklist");
    const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
    const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);
    const [newComment, setNewComment] = useState("");
    const [showActivity, setShowActivity] = useState(true);
    const [isCompleted, setIsCompleted] = useState(task.is_completed || false);

    // Date states
    const [startDate, setStartDate] = useState(task.start_date || "");
    const [dueDate, setDueDate] = useState(task.due_date || "");
    const [dueTime, setDueTime] = useState(task.due_time || "");
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateTask = useUpdateTask();

    // ✅ OPTIMIZACIÓN: Los hooks solo hacen fetch cuando el modal está abierto
    const { data: checklists = [] } = useChecklists(task.id, isOpen);
    const createChecklist = useCreateChecklist();
    const deleteChecklist = useDeleteChecklist();
    const createChecklistItem = useCreateChecklistItem();
    const toggleChecklistItem = useToggleChecklistItem();
    const deleteChecklistItem = useDeleteChecklistItem();
    const { data: attachments = [] } = useAttachments(task.id, isOpen);
    const uploadAttachment = useUploadAttachment();
    const deleteAttachment = useDeleteAttachment();
    const { data: comments = [] } = useComments(task.id, isOpen);
    const createComment = useCreateComment();
    const deleteComment = useDeleteComment();
    const updateComment = useUpdateComment();
    const { data: activities = [] } = useActivities(task.id, isOpen);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState("");

    // Reset state when task changes
    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description || "");
        setStatus(task.status as TaskStatus);
        setLabelColor(task.label_color || "");
        setLabelText(task.label_text || "");
        setIsCompleted(task.is_completed || false);
        setStartDate(task.start_date || "");
        setDueDate(task.due_date || "");
        setDueTime(task.due_time || "");
    }, [task]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (previewAttachment) return; // Let FilePreviewModal handle it

                if (showStatusMenu) { setShowStatusMenu(false); return; }
                if (showLabelMenu) { setShowLabelMenu(false); return; }
                if (showDatePicker) { setShowDatePicker(false); return; }
                if (showChecklistForm) { setShowChecklistForm(false); return; }

                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, showStatusMenu, showLabelMenu, showDatePicker, showChecklistForm, previewAttachment]);

    const currentColumn = TASK_COLUMNS.find((col) => col.id === status);

    const handleSaveTitle = async () => {
        if (!title.trim()) return;
        await updateTask.mutateAsync({ id: task.id, title: title.trim() });
        setIsEditingTitle(false);
    };

    const handleSaveDescription = async () => {
        await updateTask.mutateAsync({ id: task.id, description: description.trim() || null });
        setIsEditingDescription(false);
    };

    const handleStatusChange = async (newStatus: TaskStatus) => {
        setStatus(newStatus);
        await updateTask.mutateAsync({ id: task.id, status: newStatus });
        setShowStatusMenu(false);
    };

    const handleLabelChange = async (color: string, text: string) => {
        setLabelColor(color);
        setLabelText(text);
        await updateTask.mutateAsync({ id: task.id, label_color: color, label_text: text });
        setShowLabelMenu(false);
    };

    const handleSaveDates = async () => {
        await updateTask.mutateAsync({
            id: task.id,
            start_date: startDate || null,
            due_date: dueDate || null,
            due_time: dueTime || null,
        });
        setShowDatePicker(false);
    };

    const handleClearDates = async () => {
        setStartDate("");
        setDueDate("");
        setDueTime("");
        await updateTask.mutateAsync({
            id: task.id,
            start_date: null,
            due_date: null,
            due_time: null,
        });
        setShowDatePicker(false);
    };

    const handleCreateChecklist = async () => {
        await createChecklist.mutateAsync({ taskId: task.id, title: newChecklistTitle });
        setNewChecklistTitle("Checklist");
        setShowChecklistForm(false);
    };

    const handleAddChecklistItem = async (checklistId: string) => {
        const text = newItemTexts[checklistId];
        if (!text?.trim()) return;
        await createChecklistItem.mutateAsync({ checklistId, taskId: task.id, title: text.trim() });
        setNewItemTexts({ ...newItemTexts, [checklistId]: "" });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadAttachment.mutateAsync({ taskId: task.id, file });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const getFileIcon = (fileType: string | null) => {
        if (fileType?.startsWith("image/")) return <Image className="h-4 w-4" />;
        if (fileType?.includes("pdf")) return <FileText className="h-4 w-4" />;
        return <File className="h-4 w-4" />;
    };

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: (Date | null)[] = [];

        // Add empty days for padding
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        // Add days of month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const formatDateForInput = (date: Date) => {
        return date.toISOString().split("T")[0];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Status Header */}
                <div
                    className="px-4 py-2 flex items-center justify-between"
                    style={{
                        backgroundColor: currentColumn?.color === "bg-gray-100" ? "#f3f4f6" :
                            currentColumn?.color === "bg-blue-50" ? "#eff6ff" :
                                currentColumn?.color === "bg-red-50" ? "#fef2f2" :
                                    currentColumn?.color === "bg-green-50" ? "#f0fdf4" :
                                        currentColumn?.color === "bg-purple-50" ? "#faf5ff" : "#f3f4f6"
                    }}
                >
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
                        >
                            <span>{currentColumn?.icon}</span>
                            <span>{currentColumn?.title}</span>
                            <span className="text-xs">▼</span>
                        </button>

                        {showStatusMenu && (
                            <div className="absolute top-8 left-0 bg-background border rounded-lg shadow-lg py-2 min-w-[180px] z-10">
                                {TASK_COLUMNS.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => handleStatusChange(col.id)}
                                        className={cn(
                                            "w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2",
                                            col.id === status && "bg-muted"
                                        )}
                                    >
                                        <span>{col.icon}</span>
                                        <span>{col.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={onClose} className="p-1 hover:bg-black/10 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex">
                        {/* Main Content */}
                        <div className="flex-1 p-6 space-y-6">
                            {/* Title */}
                            <div className="flex items-start gap-3">
                                {/* Complete Task Checkbox */}
                                <button
                                    onClick={async () => {
                                        const newCompleted = !isCompleted;
                                        setIsCompleted(newCompleted);
                                        await updateTask.mutateAsync({ id: task.id, is_completed: newCompleted });
                                    }}
                                    className={cn(
                                        "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                        isCompleted
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "border-muted-foreground/50 hover:border-green-500 hover:bg-green-50"
                                    )}
                                    title={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
                                >
                                    {isCompleted && (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>

                                <div className="flex-1">
                                    {isEditingTitle ? (
                                        <Input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            onBlur={handleSaveTitle}
                                            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                                            autoFocus
                                            className="text-xl font-semibold"
                                        />
                                    ) : (
                                        <h2
                                            onClick={() => setIsEditingTitle(true)}
                                            className={cn(
                                                "text-xl font-semibold cursor-pointer hover:bg-muted/50 px-2 py-1 -mx-2 rounded",
                                                isCompleted && "line-through text-muted-foreground"
                                            )}
                                        >
                                            {title}
                                        </h2>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="text-xs">
                                    <Plus className="h-3 w-3 mr-1" />
                                    Añadir
                                </Button>
                                <div className="relative">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                    >
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Fechas
                                        {dueDate && <span className="ml-1 text-primary">•</span>}
                                    </Button>

                                    {/* Date Picker Popup */}
                                    {showDatePicker && (
                                        <div className="absolute top-10 left-0 bg-background border rounded-lg shadow-xl p-4 min-w-[320px] z-20">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-medium">Fechas</h4>
                                                <button onClick={() => setShowDatePicker(false)}>
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Calendar */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>
                                                    <span className="text-sm font-medium">
                                                        {calendarMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                                                    </span>
                                                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                                    {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => (
                                                        <div key={d} className="p-1 font-medium text-muted-foreground">{d}</div>
                                                    ))}
                                                    {getDaysInMonth(calendarMonth).map((day, i) => (
                                                        <button
                                                            key={i}
                                                            disabled={!day}
                                                            onClick={() => day && setDueDate(formatDateForInput(day))}
                                                            className={cn(
                                                                "p-1 rounded hover:bg-muted",
                                                                !day && "invisible",
                                                                day && formatDateForInput(day) === dueDate && "bg-primary text-primary-foreground"
                                                            )}
                                                        >
                                                            {day?.getDate()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Date Inputs */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium">Fecha de inicio</label>
                                                    <Input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium">Fecha de vencimiento</label>
                                                    <div className="flex gap-2 mt-1">
                                                        <Input
                                                            type="date"
                                                            value={dueDate}
                                                            onChange={(e) => setDueDate(e.target.value)}
                                                        />
                                                        <Input
                                                            type="time"
                                                            value={dueTime}
                                                            onChange={(e) => setDueTime(e.target.value)}
                                                            className="w-24"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-4">
                                                <Button size="sm" onClick={handleSaveDates} className="flex-1">
                                                    Guardar
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={handleClearDates}>
                                                    Quitar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setShowChecklistForm(!showChecklistForm)}
                                    >
                                        <CheckSquare className="h-3 w-3 mr-1" />
                                        Checklist
                                        {checklists.length > 0 && <span className="ml-1 text-primary">•</span>}
                                    </Button>

                                    {showChecklistForm && (
                                        <div className="absolute top-10 left-0 bg-background border rounded-lg shadow-xl p-4 min-w-[250px] z-20">
                                            <h4 className="font-medium mb-3">Añadir checklist</h4>
                                            <Input
                                                value={newChecklistTitle}
                                                onChange={(e) => setNewChecklistTitle(e.target.value)}
                                                placeholder="Título..."
                                                className="mb-2"
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={handleCreateChecklist}>
                                                    Añadir
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setShowChecklistForm(false)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button variant="outline" size="sm" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    Miembros
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Paperclip className="h-3 w-3 mr-1" />
                                    Adjunto
                                    {attachments.length > 0 && <span className="ml-1 text-primary">•</span>}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {/* Due Date Display */}
                            {dueDate && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Vence: {new Date(dueDate).toLocaleDateString("es-ES")} {dueTime}</span>
                                </div>
                            )}

                            {/* Labels */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">Etiquetas</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {labelText && (
                                        <Badge style={{ backgroundColor: labelColor }} className="text-white">
                                            {labelText}
                                        </Badge>
                                    )}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowLabelMenu(!showLabelMenu)}
                                            className="w-8 h-8 rounded bg-muted hover:bg-muted/80 flex items-center justify-center"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>

                                        {showLabelMenu && (
                                            <div className="absolute top-10 left-0 bg-background border rounded-lg shadow-lg p-3 min-w-[200px] z-10">
                                                <p className="text-xs font-medium mb-2">Seleccionar etiqueta</p>
                                                <Input
                                                    value={labelText}
                                                    onChange={(e) => setLabelText(e.target.value)}
                                                    placeholder="Nombre de etiqueta..."
                                                    className="text-sm mb-2"
                                                />
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {LABEL_COLORS.map((color) => (
                                                        <button
                                                            key={color.value}
                                                            onClick={() => handleLabelChange(color.value, labelText || color.name)}
                                                            className={cn(
                                                                "w-8 h-6 rounded",
                                                                labelColor === color.value && "ring-2 ring-offset-1 ring-black"
                                                            )}
                                                            style={{ backgroundColor: color.value }}
                                                            title={color.name}
                                                        />
                                                    ))}
                                                </div>
                                                <Button size="sm" className="w-full" onClick={() => handleLabelChange(labelColor || "#3b82f6", labelText)}>
                                                    Aplicar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Checklists */}
                            {checklists.map((checklist) => (
                                <div key={checklist.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium flex items-center gap-2">
                                            <CheckSquare className="h-4 w-4" />
                                            {checklist.title}
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteChecklist.mutate({ id: checklist.id, taskId: task.id })}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Progress */}
                                    {checklist.items && checklist.items.length > 0 && (
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <span>{Math.round((checklist.items.filter(i => i.is_completed).length / checklist.items.length) * 100)}%</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${(checklist.items.filter(i => i.is_completed).length / checklist.items.length) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div className="space-y-2">
                                        {checklist.items?.map((item) => (
                                            <div key={item.id} className="flex items-center gap-2 group">
                                                <Checkbox
                                                    checked={item.is_completed}
                                                    onCheckedChange={(checked) =>
                                                        toggleChecklistItem.mutate({ id: item.id, taskId: task.id, isCompleted: !!checked })
                                                    }
                                                />
                                                <span className={cn("flex-1 text-sm", item.is_completed && "line-through text-muted-foreground")}>
                                                    {item.title}
                                                </span>
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                    onClick={() => deleteChecklistItem.mutate({ id: item.id, taskId: task.id })}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add item */}
                                    <div className="flex gap-2 mt-3">
                                        <Input
                                            value={newItemTexts[checklist.id] || ""}
                                            onChange={(e) => setNewItemTexts({ ...newItemTexts, [checklist.id]: e.target.value })}
                                            placeholder="Añadir elemento..."
                                            className="text-sm"
                                            onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem(checklist.id)}
                                        />
                                        <Button size="sm" onClick={() => handleAddChecklistItem(checklist.id)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {/* Attachments */}
                            {attachments.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Paperclip className="h-4 w-4" />
                                        Adjuntos
                                    </h3>
                                    <div className="space-y-2">
                                        {attachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className="flex items-center gap-3 p-2 border rounded-lg group cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => setPreviewAttachment(att)}
                                            >
                                                {getFileIcon(att.file_type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{att.file_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {att.file_size ? `${Math.round(att.file_size / 1024)}KB` : "?? KB"}
                                                    </p>
                                                </div>
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAttachment.mutate({ id: att.id, taskId: task.id, fileUrl: att.file_url });
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <span>≡</span> Descripción
                                </h3>
                                {isEditingDescription ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Añadir una descripción más detallada..."
                                            className="min-h-[100px]"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSaveDescription}>Guardar</Button>
                                            <Button size="sm" variant="ghost" onClick={() => {
                                                setDescription(task.description || "");
                                                setIsEditingDescription(false);
                                            }}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setIsEditingDescription(true)}
                                        className={cn(
                                            "min-h-[80px] p-3 rounded-lg cursor-pointer",
                                            description ? "bg-muted/30 hover:bg-muted/50" : "bg-muted hover:bg-muted/80"
                                        )}
                                    >
                                        {description || <span className="text-muted-foreground">Añadir una descripción más detallada...</span>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar - Comments & Activity */}
                        <div className="w-80 border-l p-4 bg-muted/30 flex flex-col max-h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Comentarios y Actividad
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setShowActivity(!showActivity)}
                                >
                                    {showActivity ? "Solo comentarios" : "Mostrar todo"}
                                </Button>
                            </div>

                            {/* Comment Input */}
                            <div className="mb-4">
                                <div className="flex gap-2">
                                    <Input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Escribe un comentario..."
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                                                e.preventDefault();
                                                createComment.mutate({ taskId: task.id, content: newComment });
                                                setNewComment("");
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (newComment.trim()) {
                                                createComment.mutate({ taskId: task.id, content: newComment });
                                                setNewComment("");
                                            }
                                        }}
                                        disabled={!newComment.trim() || createComment.isPending}
                                    >
                                        {createComment.isPending ? "..." : "Enviar"}
                                    </Button>
                                </div>
                            </div>

                            {/* Comments & Activity List */}
                            <div className="flex-1 overflow-y-auto space-y-3 text-sm">
                                {/* Comments */}
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-2 group">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                            {comment.user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-xs">
                                                    {comment.user?.full_name || "Usuario"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(comment.created_at).toLocaleDateString("es-ES", {
                                                        day: "numeric",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100 ml-auto flex gap-1">
                                                    <button
                                                        className="text-muted-foreground hover:text-primary"
                                                        onClick={() => {
                                                            setEditingCommentId(comment.id);
                                                            setEditingCommentContent(comment.content);
                                                        }}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={() => deleteComment.mutate({ id: comment.id, taskId: task.id })}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            {editingCommentId === comment.id ? (
                                                <div className="mt-1 space-y-2">
                                                    <Textarea
                                                        value={editingCommentContent}
                                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                                        className="text-sm min-h-[60px]"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                updateComment.mutate({
                                                                    id: comment.id,
                                                                    taskId: task.id,
                                                                    content: editingCommentContent,
                                                                });
                                                                setEditingCommentId(null);
                                                            }}
                                                            disabled={!editingCommentContent.trim()}
                                                        >
                                                            Guardar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingCommentId(null)}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm mt-1 bg-background rounded-lg p-2 border">
                                                    {comment.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Activity (if enabled) */}
                                {showActivity && activities.map((activity) => (
                                    <div key={activity.id} className="flex gap-2 opacity-70">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                            {activity.user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs">
                                                <span className="font-medium">{activity.user?.full_name || "Usuario"}</span>
                                                {" "}
                                                {activity.activity_type === "created" && "creó esta tarjeta"}
                                                {activity.activity_type === "status_changed" && (
                                                    <>movió a <span className="text-primary">{activity.metadata?.new_status}</span></>
                                                )}
                                                {activity.activity_type === "comment_added" && "añadió un comentario"}
                                                {activity.activity_type === "checklist_added" && "añadió un checklist"}
                                                {activity.activity_type === "checklist_completed" && "completó un checklist"}
                                                {activity.activity_type === "attachment_added" && "adjuntó un archivo"}
                                                {activity.activity_type === "due_date_set" && "estableció fecha de vencimiento"}
                                                {activity.activity_type === "label_changed" && "cambió la etiqueta"}
                                            </p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock className="h-3 w-3" />
                                                {new Date(activity.created_at).toLocaleDateString("es-ES", {
                                                    day: "numeric",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {/* Default: Task creation */}
                                {comments.length === 0 && activities.length === 0 && (
                                    <div className="flex gap-2 opacity-70">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium">
                                            🐱
                                        </div>
                                        <div>
                                            <p className="text-xs">
                                                <span className="font-medium">Sistema</span> creó esta tarjeta en{" "}
                                                <span className="text-primary">{currentColumn?.icon} {currentColumn?.title}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(task.created_at).toLocaleDateString("es-ES", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* File Preview Modal */}
            {previewAttachment && (
                <FilePreviewModal
                    attachment={previewAttachment}
                    taskId={task.id}
                    onClose={() => setPreviewAttachment(null)}
                />
            )}
        </div>
    );
}
