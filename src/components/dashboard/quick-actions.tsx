import Link from "next/link";
import { Plus, FolderPlus, UserPlus, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  isAdmin: boolean;
}

export function QuickActions({ isAdmin }: QuickActionsProps) {
  const actions = [
    {
      label: "Nuevo Proyecto",
      href: "/projects/new",
      icon: FolderPlus,
      adminOnly: false,
    },
    {
      label: "Nuevo Cliente",
      href: "/clients/new",
      icon: UserPlus,
      adminOnly: true,
    },
    {
      label: "Nueva Transaccion",
      href: "/finances/new",
      icon: Receipt,
      adminOnly: true,
    },
  ];

  const filteredActions = actions.filter((action) => !action.adminOnly || isAdmin);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Acciones Rapidas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {filteredActions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            className="h-auto justify-start gap-3 p-4"
            asChild
          >
            <Link href={action.href}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span>{action.label}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
