-- Biblioteca compartilhada: somente o backend autenticado acessa esta tabela.
create table public.princess_presets (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  recipe jsonb not null check (
    jsonb_typeof(recipe) = 'object'
    and recipe @> '{"version":1}'::jsonb
    and octet_length(recipe::text) <= 32768
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index princess_presets_library_updated_idx
  on public.princess_presets (library_id, updated_at desc);

alter table public.princess_presets enable row level security;

revoke all on table public.princess_presets from public, anon, authenticated;
grant select, insert, update, delete on table public.princess_presets to service_role;

comment on table public.princess_presets is
  'Presets compartilhados do Editor da Princesa. Acesso exclusivo pelo backend com sessão validada.';
