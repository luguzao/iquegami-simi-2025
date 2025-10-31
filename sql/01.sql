-- Danger: apaga a tabela atual e recria
DROP TABLE IF EXISTS public.employees CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL UNIQUE,
  name text NOT NULL,
  store text,
  position text,
  sector text,
  "startDate" date,
  "isInternal" boolean NOT NULL DEFAULT true,
  role text,
  created_at timestamptz DEFAULT now()
);