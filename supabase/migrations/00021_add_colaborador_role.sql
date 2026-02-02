-- ==============================================
-- Migración: Agregar rol "colaborador" al enum user_role
-- ==============================================

-- Agregar el valor 'colaborador' al tipo enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'colaborador';
