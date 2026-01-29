"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Trash2, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskAttachment } from "@/types/task";
import { useDeleteAttachment } from "@/hooks/use-task-extras";

interface FilePreviewModalProps {
    attachment: TaskAttachment | null;
    onClose: () => void;
    taskId: string;
}

export function FilePreviewModal({ attachment, onClose, taskId }: FilePreviewModalProps) {
    const deleteAttachment = useDeleteAttachment();

    if (!attachment) return null;

    const isImage = attachment.file_type?.startsWith("image/");
    const isPdf = attachment.file_type?.includes("pdf");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleDelete = async () => {
        if (!confirm("¿Eliminar este archivo?")) return;
        await deleteAttachment.mutateAsync({
            id: attachment.id,
            taskId: taskId,
            fileUrl: attachment.file_url
        });
        onClose();
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(attachment.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = attachment.file_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading file:", error);
            window.open(attachment.file_url, "_blank");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded">
                        {isImage ? <ImageIcon className="h-5 w-5" /> :
                            isPdf ? <FileText className="h-5 w-5" /> :
                                <File className="h-5 w-5" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg leading-tight">{attachment.file_name}</h3>
                        <p className="text-xs text-white/60">
                            Añadido: {new Date(attachment.created_at).toLocaleString()} • {attachment.file_size ? `${Math.round(attachment.file_size / 1024)} KB` : "Tamaño desconocido"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10"
                        onClick={() => window.open(attachment.file_url, "_blank")}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir en nueva pestaña
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10"
                        onClick={handleDownload}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-red-500/20 hover:text-red-400"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10 ml-2"
                        onClick={onClose}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Main Content (Preview) */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-black/50 relative">
                {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="max-h-full max-w-full object-contain shadow-2xl rounded-sm"
                    />
                ) : isPdf ? (
                    <iframe
                        src={`${attachment.file_url}#toolbar=0`}
                        className="w-full h-full max-w-5xl bg-white shadow-2xl rounded-sm"
                        title={attachment.file_name}
                    />
                ) : (
                    <div className="text-center text-white space-y-4">
                        <File className="h-24 w-24 mx-auto text-white/20" />
                        <p className="text-xl font-medium">No hay vista previa disponible</p>
                        <Button
                            variant="secondary"
                            onClick={handleDownload}
                        >
                            Descargar archivo
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
