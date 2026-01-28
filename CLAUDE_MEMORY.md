# Haiku - Memoria del Proyecto

## Resumen
SaaS interno de **Gestión de Proyectos y Finanzas** para una agencia (1 admin + 4 colaboradores).
Referente visual: **Midday.ai** (limpieza, bento grids, minimalismo).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15+ (App Router), TypeScript |
| Estilos | Tailwind CSS + Shadcn/UI (tema Nature - tonos verdes/tierra) |
| Charts | Recharts (gráficos de área estilo Midday) |
| Estado | TanStack Query v5 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |

---

## Credenciales Supabase

- **Project ID:** `myypxlzqjaulkaeiayec`
- **URL:** `https://myypxlzqjaulkaeiayec.supabase.co`
- **Configuradas en:** `.env.local` (no commitear)

---

## Arquitectura de Base de Datos

### Tablas

1. **profiles** - Usuarios vinculados a auth.users
   - `role`: ENUM ('admin' | 'user')
   - `full_name`, `avatar_url`

2. **clients** - Clientes de la agencia
   - `name`, `company`, `email`, `phone`, `notes`

3. **projects** - Proyectos con metadata JSONB
   - `name`, `status`, `deadline`, `client_id`, `budget`
   - `metadata`: JSONB para configs flexibles (n8n, AI prompts, integraciones)

4. **transactions** - Finanzas (SOLO ADMIN)
   - `amount`, `type` (income/expense), `category`, `date`

5. **project_members** - Relación M:N usuarios-proyectos

### Políticas RLS

| Tabla | Admin | User |
|-------|-------|------|
| profiles | CRUD | Solo lectura + actualizar propio |
| clients | CRUD | Solo lectura (relacionados) |
| projects | CRUD | Solo proyectos asignados |
| transactions | CRUD | **BLOQUEADO** |
| project_members | CRUD | Solo lectura |

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── (auth)/           # Login, Signup
│   └── (dashboard)/      # Dashboard, Projects, Finances
├── components/
│   ├── ui/               # Shadcn components
│   ├── layout/           # Sidebar, Header
│   ├── dashboard/        # FinancialOverview, QuickActions
│   └── projects/         # ProjectCard
├── hooks/                # TanStack Query v5 hooks
├── actions/              # Server Actions con Zod
├── types/                # TypeScript + interfaces JSONB
└── lib/supabase/         # Cliente Supabase + middleware
```

---

## Componentes Clave

### FinancialOverview
- Gráfico de área con Recharts
- Muestra Ingresos (verde) vs Gastos (terracota)
- Solo visible para admin
- Ubicación: `src/components/dashboard/financial-overview.tsx`

### ProjectCard
- Tarjeta minimalista estilo Midday
- Barra de color izquierda según status
- Badge "AI" si tiene `n8n_workflow_id` o `ai_prompts`
- Ubicación: `src/components/projects/project-card.tsx`

---

## Tipos TypeScript para JSONB

```typescript
interface ProjectMetadata {
  n8n_workflow_id?: string | null;
  ai_prompts?: Record<string, string>;
  integrations?: {
    slack_channel?: string;
    notion_page?: string;
    github_repo?: string;
  };
  custom_fields?: Record<string, unknown>;
}
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Generar tipos de Supabase
npm run db:gen-types

# Build
npm run build
```

---

## Estado Actual

- [x] Configuración inicial (Next.js, Tailwind, Shadcn)
- [x] Tema Nature configurado (verdes/tierra)
- [x] Base de datos creada en Supabase
- [x] Políticas RLS implementadas
- [x] Tipos TypeScript creados
- [x] Hooks TanStack Query v5
- [x] Server Actions con Zod
- [x] Layout del dashboard (Sidebar, Header)
- [x] Componente FinancialOverview
- [x] Componente ProjectCard
- [x] Páginas: Login, Signup, Dashboard, Projects, Finances
- [ ] Fix trigger de creación de perfil (ejecutar 001_fix_trigger.sql)
- [ ] Crear primer usuario admin
- [ ] Seed data de prueba

---

## Próximos Pasos

1. Ejecutar `001_fix_trigger.sql` en Supabase SQL Editor
2. Registrar primer usuario
3. Cambiar rol a 'admin' en tabla profiles
4. Ejecutar `seed.sql` para datos de prueba
5. Probar flujo completo

---

## Notas de Desarrollo

- El tema Nature usa variables CSS en `globals.css`
- Los gráficos usan colores: `--chart-1` (verde), `--chart-2` (terracota)
- RLS usa funciones helper: `is_admin()`, `is_project_member()`
- El trigger `handle_new_user` crea perfil automáticamente al registrarse
