"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Iniciando sesion..." : "Iniciar sesion"}
    </Button>
  );
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Mostrar mensaje si la sesión fue cerrada por login en otro dispositivo
  useEffect(() => {
    if (searchParams.get("error") === "session_expired") {
      setError("Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.");
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setError(null);

    const result = await login({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground">H</span>
        </div>
        <CardTitle className="text-2xl">Bienvenido a Haiku</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inicia sesion para continuar
        </p>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contrasena
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
