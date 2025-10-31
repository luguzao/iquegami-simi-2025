-- 1) Garantir extensão para gen_random_uuid (Supabase usa pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Se a tabela não existir, cria com todas as colunas no formato que o app espera (camelCase)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL,
  name text NOT NULL,
  store text,
  position text,
  sector text,
  "startDate" date,
  "isInternal" boolean NOT NULL DEFAULT true,
  role text,
  created_at timestamptz DEFAULT now()
);

-- 3) Garante que temos UNIQUE em cpf (somente adiciona se não houver índice já)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_class ic ON ic.oid = i.indexrelid
    WHERE c.relname = 'employees' AND ic.relname = 'employees_cpf_key'
  ) THEN
    BEGIN
      ALTER TABLE public.employees ADD CONSTRAINT employees_cpf_key UNIQUE (cpf);
    EXCEPTION WHEN duplicate_object THEN
      -- constraint já existe, ignora
      NULL;
    END;
  END IF;
END$$;

-- 4) Adiciona colunas que possam estar ausentes (sem remover/alterar outras)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS "isInternal" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "startDate" date;