-- Tabla de perfiles de usuario para Banco de Alimentos.
-- Refleja los campos insertados durante el registro (src/app/auth/registrar/page.tsx).

create table if not exists public.usuarios (
	id uuid primary key references auth.users (id) on delete cascade,
	rol text,
	nombre text,
	tipo_persona text,
	cedula text,
	ruc text,
	direccion text,
	telefono text,
	correo text,
	email_verified boolean default false,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

-- Los roles de Supabase necesitan permisos a nivel de tabla ademas de las
-- politicas RLS (las tablas creadas por migracion no los reciben por defecto).
grant select, insert, update, delete on public.usuarios to authenticated;
grant select on public.usuarios to anon;

alter table public.usuarios enable row level security;

-- Cada usuario puede gestionar unicamente su propio perfil.
create policy "usuarios_select_propio"
	on public.usuarios for select
	using (auth.uid() = id);

create policy "usuarios_insert_propio"
	on public.usuarios for insert
	with check (auth.uid() = id);

create policy "usuarios_update_propio"
	on public.usuarios for update
	using (auth.uid() = id)
	with check (auth.uid() = id);
