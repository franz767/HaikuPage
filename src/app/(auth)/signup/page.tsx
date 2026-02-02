import { redirect } from "next/navigation";

/**
 * Página de registro deshabilitada
 * Los usuarios solo pueden ser invitados por un administrador
 */
export default function SignupPage() {
  // Redirigir al login - el registro público está deshabilitado
  redirect("/login");
}
