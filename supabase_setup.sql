-- ==============================================================================
-- AreaTask - Script de Configuração do Supabase (Cloud Sync & Realtime)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/aobwlyoredautwcjxjhp/sql
-- ==============================================================================

-- 1. Criação das tabelas caso não existam
CREATE TABLE IF NOT EXISTS public.areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon_name TEXT DEFAULT 'Folder',
  context_brain_prompt TEXT DEFAULT '',
  documents JSONB DEFAULT '[]'::jsonb,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  is_pinned_now BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,
  subtasks JSONB DEFAULT '[]'::jsonb,
  ai_brief JSONB,
  pause_context JSONB,
  desktop_launch_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garante que colunas adicionadas em fases posteriores existam caso a tabela já tenha sido criada
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS desktop_launch_url TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pause_context JSONB;

CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'yellow',
  x NUMERIC DEFAULT 40,
  y NUMERIC DEFAULT 40,
  z_index INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitação de Políticas de Acesso Público (Anon Key)
-- Permite leitura, inserção, atualização e exclusão sincronizada
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem para evitar duplicatas
DROP POLICY IF EXISTS "Public access to areas" ON public.areas;
DROP POLICY IF EXISTS "Public access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public access to sticky_notes" ON public.sticky_notes;

CREATE POLICY "Public access to areas" ON public.areas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to tasks" ON public.tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to sticky_notes" ON public.sticky_notes
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Habilitação do Supabase Realtime para sincronização instantânea
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.areas;
  EXCEPTION WHEN duplicate_object THEN
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sticky_notes;
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;
