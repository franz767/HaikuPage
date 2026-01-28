# Protocolo de Desarrollo y Arquitectura: Supabase (Production-Grade Edition)

Este documento define los principios arquitectónicos, estándares de seguridad y flujos de trabajo para desarrollar aplicaciones robustas donde **Supabase (PostgreSQL)** actúa como la fuente de verdad y la capa principal de backend.

## 1. Filosofía Arquitectónica: "Postgres como Backend"
El principio rector es aprovechar la potencia de PostgreSQL para reducir la complejidad de la capa intermedia (API servers tradicionales).

* **Arquitectura de 2 Capas (Client-to-DB):**
    * **Regla:** El cliente (frontend) debe comunicarse directamente con la base de datos a través de la API REST automática (PostgREST) o GraphQL, siempre protegido por RLS.
    * **Excepción:** No crear un servidor API intermedio (Node/Express) solo para hacer "pasamanos" de datos. Usar el SDK de Supabase (`@supabase/supabase-js`) directamente.
* **Integridad Referencial:**
    * Definir relaciones (`Foreign Keys`), restricciones (`Constraints`) y validaciones de datos (`Check Constraints`) directamente en el esquema de la base de datos, no solo en el frontend. La base de datos es la última línea de defensa.
* **Tipado Estático:**
    * Generar tipos de TypeScript automáticamente a partir del esquema de la base de datos usando el CLI de Supabase (`supabase gen types`). No escribir interfaces de datos manualmente que puedan desincronizarse.

## 2. Seguridad y Acceso (Row Level Security - RLS)
La seguridad no es opcional ni un "afterthought"; es el núcleo del acceso a datos.

* **RLS Mandatorio:**
    * **Regla de Oro:** NUNCA exponer una tabla al cliente (`anon` o `authenticated`) sin habilitar Row Level Security (`ALTER TABLE table ENABLE ROW LEVEL SECURITY`).
    * **Política de "Deny by Default":** Al habilitar RLS, el acceso se bloquea por defecto. Crear políticas explícitas (`CREATE POLICY`) para `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
* **Funciones de Seguridad `auth.uid()`:**
    * Utilizar siempre las funciones nativas de Supabase Auth dentro de las políticas SQL para asegurar que los usuarios solo accedan a sus propios datos (ej. `using ( auth.uid() = user_id )`).
* **Service Role Keys:**
    * **Restricción:** Jamás usar la `SERVICE_ROLE_KEY` en el cliente. Esta llave salta todas las reglas RLS. Úsala exclusivamente en Edge Functions administrativas o scripts de CI/CD.

## 3. Lógica de Negocio: Database Functions vs Edge Functions
Saber dónde colocar la lógica es crítico para el rendimiento y la mantenibilidad.

* **Database Functions (PL/pgSQL):**
    * **Cuándo usar:** Para lógica transaccional que requiere atomicidad estricta, manipulación de datos masiva o cuando la latencia debe ser mínima (ej. disparadores automáticos al insertar un usuario, contadores complejos).
    * **Implementación:** Usar `RPC` (Remote Procedure Calls) para exponer lógica compleja invocable desde el cliente.
* **Edge Functions (Deno/TypeScript):**
    * **Cuándo usar:** Para integraciones con servicios de terceros (Stripe, OpenAI), envío de correos, o lógica que requiere librerías de NPM no disponibles en SQL.
    * **Seguridad:** Validar siempre el JWT del usuario entrante en la Edge Function para mantener el contexto de seguridad.
* **Triggers (Desencadenadores):**
    * Utilizar Triggers para efectos secundarios automáticos dentro de la DB (ej. crear un registro en `public.profiles` automáticamente cuando un usuario se registra en `auth.users`).

## 4. Gestión de Datos y Realtime
* **Suscripciones Realtime:**
    * **Uso Prudente:** No activar Realtime en todas las tablas. Habilitarlo solo en tablas específicas y filtrar por columnas/filas para evitar saturación de sockets y costos excesivos de salida de datos (Egress).
* **Storage (Almacenamiento de Archivos):**
    * Aplicar políticas de RLS también a los "Buckets" de Storage (`storage.objects`). No dejar buckets públicos a menos que sean assets estáticos globales.
    * Usar nombres de archivo deterministas o carpetas por usuario (`/user_id/file.png`) para facilitar las políticas de seguridad.

## 5. Flujo de Trabajo Profesional (DevOps & CLI)
El desarrollo en producción no se hace desde el Dashboard web, se hace desde el código.

* **Desarrollo Local (Local First):**
    * **Regla:** Todo desarrollo comienza en local usando `supabase start`. La base de datos local debe ser un espejo de producción (Dockerizado).
* **Migraciones de Base de Datos:**
    * **Prohibido:** Modificar el esquema de producción usando la UI del Dashboard.
    * **Protocolo:** Realizar cambios en local -> Generar migración (`supabase db diff`) -> Revisar archivo SQL -> Hacer commit al repositorio.
    * Las migraciones deben ser aplicadas en CI/CD (GitHub Actions/GitLab CI) usando `supabase db push`.
* **Seeding (Datos de Prueba):**
    * Mantener un archivo `seed.sql` robusto para poblar el entorno local con datos ficticios reproducibles, facilitando el testing de nuevas features.

## 6. Testing y Calidad
* **Testing de Base de Datos (pgTAP):**
    * Implementar pruebas unitarias para las funciones de base de datos y, crucialmente, para las **Políticas RLS**. Asegurar que un usuario A no pueda ver los datos del usuario B.
* **Pruebas de Integración:**
    * Probar las Edge Functions simulando payloads reales y contextos de autenticación.

## 7. Rendimiento de Base de Datos
* **Índices:**
    * Crear índices en todas las columnas utilizadas frecuentemente en cláusulas `WHERE`, `JOIN` y `ORDER BY`. Monitorear el uso de índices con `pg_stat_statements`.
* **Vistas y Vistas Materializadas:**
    * Usar Vistas (`Views`) para simplificar consultas complejas para el frontend.
    * Usar Vistas Materializadas (`Materialized Views`) para reportes o datos agregados costosos que no requieren tiempo real absoluto.