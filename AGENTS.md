# AGENTS.md

Proyecto: **Banco de Alimentos** — aplicacion Next.js 15 (App Router, Turbopack) con
autenticacion y base de datos en Supabase. Los comandos estandar
(`npm run dev|build|lint|start`) estan documentados en `README.md`.

## Cursor Cloud specific instructions

Servicios que deben estar corriendo para probar el producto de punta a punta:

1. **Supabase local** (Docker) — provee Auth y Postgres. Sin el, el servidor Next
   no arranca: `src/lib/supabase.ts` crea el cliente al importar el modulo y lanza
   error si faltan las variables de entorno.
2. **Servidor de desarrollo Next.js** (`npm run dev`, puerto 3000).

### Puesta en marcha (el update script solo instala dependencias npm)

Docker, el CLI de Supabase y las imagenes de Supabase quedan preinstalados en el
snapshot; NO estan en el update script. Al iniciar una sesion normalmente hay que
arrancar los servicios manualmente:

- Arrancar el daemon de Docker si no esta activo (requiere sudo). El socket puede
  necesitar permisos de grupo: `sudo chmod 666 /var/run/docker.sock`.
- `supabase start` levanta el stack local. Imprime `API_URL`
  (`http://127.0.0.1:54321`) y `ANON_KEY`.
- `npm run dev` inicia la app en `http://localhost:3000`.

### Variables de entorno (`.env`, no versionado)

La app requiere estas dos variables. Con Supabase local el `ANON_KEY` es la clave
demo fija (siempre la misma), asi que `.env` se puede recrear con:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY que imprime `supabase start`>
```

Para usar el proyecto Supabase real en la nube, reemplazar estos valores por la
URL y anon key de ese proyecto.

### Base de datos

- El esquema local vive en `supabase/migrations/`. La tabla `usuarios` refleja los
  campos que inserta el registro (`src/app/auth/registrar/page.tsx`).
- Gotcha: las tablas creadas por migracion NO reciben permisos automaticos para los
  roles `authenticated`/`anon` de Supabase; ademas de las politicas RLS hay que dar
  `grant ... on public.usuarios to authenticated` o el registro falla con
  `permission denied for table usuarios`. Ya esta contemplado en la migracion.
- `supabase db reset` re-aplica las migraciones y borra los usuarios de prueba.

### Notas para probar el flujo de registro/login

- El registro exige una cedula ecuatoriana valida por algoritmo antes de mostrar el
  resto del formulario. Cedula de prueba valida: `1710034065`.
- La consulta externa al SRI/APIs de cedula suele fallar en este entorno; la app lo
  maneja permitiendo el ingreso manual (comportamiento esperado, no es un bug).
- En Supabase local la confirmacion de email esta desactivada
  (`enable_confirmations = false`), asi que un usuario recien registrado puede
  iniciar sesion de inmediato.
