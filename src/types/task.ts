import type { Database } from "./database";

// Tipo base de la tabla
export type Task = Database["public"]["Tables"]["project_tasks"]["Row"] & {
    start_date?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    is_completed?: boolean;
    // Contadores desnormalizados para evitar N+1 queries
    checklist_total?: number;
    checklist_completed?: number;
    attachments_count?: number;
    comments_count?: number;
};
export type TaskInsert = Database["public"]["Tables"]["project_tasks"]["Insert"] & {
    start_date?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    is_completed?: boolean;
};
export type TaskUpdate = Database["public"]["Tables"]["project_tasks"]["Update"] & {
    start_date?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    is_completed?: boolean;
};

// Estados posibles para las tareas (columnas del Kanban)
export type TaskStatus = "inicio" | "desarrollo" | "bloqueado" | "testing" | "entregado";

// Configuración de las columnas del Kanban
export const TASK_COLUMNS: {
    id: TaskStatus;
    title: string;
    icon: string;
    color: string;
}[] = [
        { id: "inicio", title: "Por Iniciar", icon: "📋", color: "bg-gray-100" },
        { id: "desarrollo", title: "En Desarrollo", icon: "🔄", color: "bg-blue-50" },
        { id: "bloqueado", title: "Bloqueado", icon: "🚫", color: "bg-red-50" },
        { id: "testing", title: "Testing/QA", icon: "✅", color: "bg-green-50" },
        { id: "entregado", title: "Entregado", icon: "🎉", color: "bg-purple-50" },
    ];

// Colores disponibles para etiquetas
export const LABEL_COLORS = [
    { name: "Rojo", value: "#ef4444" },
    { name: "Naranja", value: "#f97316" },
    { name: "Amarillo", value: "#eab308" },
    { name: "Verde", value: "#22c55e" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Violeta", value: "#8b5cf6" },
    { name: "Rosa", value: "#ec4899" },
];

// Tipos para Checklist
export interface Checklist {
    id: string;
    task_id: string;
    title: string;
    position: number;
    created_at: string;
    items?: ChecklistItem[];
}

export interface ChecklistItem {
    id: string;
    checklist_id: string;
    title: string;
    is_completed: boolean;
    position: number;
    created_at: string;
}

// Tipos para Adjuntos
export interface TaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
    uploaded_by: string | null;
    created_at: string;
}

// Tipos para Comentarios
export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    // Datos del usuario (joined)
    user?: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

// Tipos para Actividad
export type ActivityType =
    | "created"
    | "status_changed"
    | "comment_added"
    | "checklist_added"
    | "checklist_completed"
    | "attachment_added"
    | "due_date_set"
    | "label_changed";

export interface TaskActivity {
    id: string;
    task_id: string;
    user_id: string;
    activity_type: ActivityType;
    metadata: Record<string, any> | null;
    created_at: string;
    // Datos del usuario (joined)
    user?: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

// Función helper para obtener columna por ID
export function getColumnById(id: TaskStatus) {
    return TASK_COLUMNS.find((col) => col.id === id);
}
