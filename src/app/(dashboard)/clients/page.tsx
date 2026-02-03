"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, Mail, Phone, Trash2, Edit, X, Loader2, FolderOpen, Calendar, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClients, useDeleteClient, useUpdateClient } from "@/hooks/use-clients";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useProjects } from "@/hooks/use-projects";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients();
  const deleteClient = useDeleteClient();
  const updateClient = useUpdateClient();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentProfile();

  // Estado para el modal de edicion
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Estado para el modal de proyectos
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  // Obtener proyectos del cliente seleccionado
  const { data: clientProjects, isLoading: isLoadingProjects } = useProjects(
    viewingClient?.id ?? undefined
  );

  // Solo mostrar opciones de admin cuando el perfil ya cargó completamente
  const isAdmin = !isLoadingProfile && profile?.role === "admin";

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar cliente "${name}"?`)) return;
    try {
      await deleteClient.mutateAsync(id);
    } catch (err) {
      alert("Error al eliminar: " + (err as Error).message);
    }
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setEditForm({ name: "", company: "", email: "", phone: "", notes: "" });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (!editForm.name.trim()) {
      alert("El nombre es requerido");
      return;
    }

    try {
      await updateClient.mutateAsync({
        id: editingClient.id,
        name: editForm.name.trim(),
        company: editForm.company.trim() || null,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      closeEditModal();
    } catch (err) {
      alert("Error al actualizar: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes de tu agencia
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Link>
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">
          Error al cargar clientes: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && clients?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay clientes</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin
                ? "Comienza agregando tu primer cliente"
                : "No hay clientes registrados"}
            </p>
            {isAdmin && (
              <Button asChild>
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Cliente
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client list */}
      {!isLoading && clients && clients.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="group relative cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setViewingClient(client)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{client.name}</h3>
                    {client.company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {client.company}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => openEditModal(client)}
                        title="Editar cliente"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(client.id, client.name)}
                        title="Eliminar cliente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {client.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {client.phone}
                    </p>
                  )}
                </div>

                {client.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {client.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de edicion */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEditModal}
          />

          {/* Modal */}
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Editar Cliente</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeEditModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Nombre del cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">Empresa</Label>
                <Input
                  id="edit-company"
                  value={editForm.company}
                  onChange={(e) =>
                    setEditForm({ ...editForm, company: e.target.value })
                  }
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefono</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  placeholder="+51 999 999 999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditModal}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateClient.isPending}
                  className="flex-1"
                >
                  {updateClient.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de proyectos del cliente */}
      <Dialog open={!!viewingClient} onOpenChange={() => setViewingClient(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Proyectos de {viewingClient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : clientProjects && clientProjects.length > 0 ? (
              <div className="space-y-3">
                {clientProjects.map((project) => {
                  const statusColors: Record<string, string> = {
                    inicio: "bg-blue-100 text-blue-700",
                    "en progreso": "bg-amber-100 text-amber-700",
                    revision: "bg-purple-100 text-purple-700",
                    completado: "bg-emerald-100 text-emerald-700",
                    cancelado: "bg-red-100 text-red-700",
                  };

                  return (
                    <div
                      key={project.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{project.name}</h4>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {project.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {(() => {
                                  const [y, m, d] = project.deadline.split('-').map(Number);
                                  return new Date(y, m - 1, d).toLocaleDateString("es-PE", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  });
                                })()}
                              </span>
                            )}
                            {project.budget && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                S/ {project.budget.toLocaleString("es-PE")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-700"}>
                            {project.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link href={`/projects/${project.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Este cliente no tiene proyectos asignados
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setViewingClient(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
