# PETID — collar QR para mascotas

Prototipo: la ficha de una mascota vive en Supabase, se sirve como perfil público en Vercel, y el dueño genera un QR para el collar con un link directo a WhatsApp.

- Stack: Vercel (estático + funciones serverless) + Supabase (Postgres) + GitHub. Sin framework de frontend, sin ORM.
- Tests: `vitest` (31 tests: helpers puros y handlers con la capa de datos falsificada — no tocan red ni credenciales).

## Rutas

| Ruta | Qué hace |
| --- | --- |
| `GET /` | Alta de mascota |
| `POST /api/pets` | Crea la ficha → `{ slug, edit_token }` (el token se muestra **una sola vez**) |
| `GET /api/pets/<slug>` | Datos públicos (sin `edit_token`) |
| `PUT /api/pets/<slug>` | Actualiza; exige `edit_token` correcto → si no, `403` |
| `GET /pet/<slug>` | Perfil público (rewrite → `/api/profile/<slug>`, HTML server-side) |
| `/pet/<slug>/edit` | Edición (token desde `localStorage` o `?token=`) |
| `/pet/<slug>/tag` | Generador de QR: preview en vivo, descarga PNG e impresión |

## Flujo de uso

1. Entra a `/` y llena la ficha.
2. Copia el **token de edición** (queda también en `localStorage` de ese navegador). Es la única llave: sin él no se puede editar.
3. Abre `/pet/<slug>/tag`, descarga el PNG, imprímelo y ponlo en el collar.
4. Quien escanee el QR abre `/pet/<slug>` y puede escribir por WhatsApp con un toque (`wa.me` se deriva de `owner_phone`).

## Desarrollo

```bash
npm install
npm test          # vitest run
npx vercel dev    # entorno local con funciones serverless
```

Variables de entorno (`.env` local o env vars del proyecto en Vercel):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

La `service_role` key vive **solo** en las funciones serverless; el navegador nunca la recibe. El frontend habla únicamente con `/api/*`.

## Base de datos

`supabase/migrations/0001_pets.sql` crea `public.pets` (12 columnas, PK `slug`). Ya está aplicada en el proyecto `petid` (`us-east-1`).

## Caveats del free tier (honestos)

- **Supabase pausa proyectos inactivos** (~1 semana sin actividad) → un proyecto pausado deja el QR muerto. Mitigación: `.github/workflows/keepalive.yml` hace un ping diario a la app y a una ficha. Si aun así se pausa, se restaura con un clic en el dashboard.
- **Vercel Hobby** es para uso personal/no comercial. Si esto se vuelve negocio, toca plan Pro.
- **Sin RLS en el prototipo**: `public.pets` tiene RLS deshabilitado. Como la única clave que existe es la `service_role` (que ignora RLS de todos modos) y el navegador jamás recibe una clave, el riesgo hoy es el de la API abierta: cualquiera puede crear fichas. Antes de exponer esto en serio: activar RLS + políticas y pasar a claves publicables + RPC.
- **Sin recuperación de token**: si se pierde, hay que editar la fila en Supabase o crear una ficha nueva (no hay login de dueños, decisión del prototipo).
- **Foto por URL**: la subida de archivos quedó fuera; `photo_url` es un enlace directo a una imagen.
- `location.origin` para el QR es correcto en producción; con `vercel dev` genera la URL local (`http://localhost:3000/pet/...`), no la pública.

## Fuera de alcance

NFC, GPS, RLS/multiusuario, login de dueños, notificaciones, hosting comercial.
