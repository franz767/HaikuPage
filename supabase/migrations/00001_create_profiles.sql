-- ==============================================
-- Tabla: profiles
-- Descripcion: Perfiles de usuario vinculados a auth.users
-- ==============================================

-- Crear tipo ENUM para roles
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Crear tabla profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios para documentacion
COMMENT ON TABLE public.profiles IS 'Perfiles de usuario con roles y datos adicionales';
COMMENT ON COLUMN public.profiles.id IS 'UUID del usuario de auth.users';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario: admin tiene acceso total, user acceso limitado';
COMMENT ON COLUMN public.profiles.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL del avatar del usuario (Storage)';

-- Indice para buscar por rol
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
