"use client";

import Link from "next/link";
import { Plus, Building2, Mail, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { useCurrentProfile } from "@/hooks/use-profile";

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients();
  const deleteClient = useDeleteClient();
  const { data: profile } = useCurrentProfile();

  const isAdmin = profile?.role === "admin";

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar cliente "${name}"?`)) return;
    try {
      await deleteClient.mutateAsync(id);
    } catch (err) {
      alert("Error al eliminar: " + (err as Error).message);
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
            <Card key={client.id} className="group relative">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(client.id, client.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {client.phone}
                    </a>
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
    </div>
  );
}