# PETID — collar QR para mascotas

Prototipo: la ficha de una mascota vive en Supabase, se sirve como perfil público en Vercel, y el dueño genera un QR para el collar con un link directo a WhatsApp.

- Stack: Vercel (estático + funciones serverless) + Supabase (Postgres) + GitHub. Sin framework de frontend, sin ORM.
- Tests: `vitest` (53 tests: helpers puros, handlers con la capa de datos falsificada y el QR decodificado de verdad con `jsqr` — no tocan red ni credenciales).
- QR: lo genera el servidor con `qrcode` (MIT, 1.5.4). Nunca un CDN: si el CDN cae, el QR se queda sin dibujar (ya pasó, ver `Caveats`).
- Interfaz: "Carnet". La ficha se lee como un documento impreso (carné de vacunación, pasaporte). Tipografías autoalojadas en `public/fonts/` —Source Serif 4 y JetBrains Mono, ambas OFL, subconjunto latino, 88 KB entre las dos, un archivo variable por familia— servidas desde el propio sitio, sin CDN de fuentes.
- Impresión: la etiqueta del collar sale a **50 × 50 mm reales** (`@page` + `.tile{width:50mm;height:50mm}`). No es una promesa: se imprime a PDF, se rasteriza a 300 dpi y se mide el recorte (49,7 × 50,0 mm, QR de 21,7 mm que **decodifica desde los píxeles impresos**, módulo 0,87 mm).

## Rutas

| Ruta | Qué hace |
| --- | --- |
| `GET /` | Alta de mascota |
| `POST /api/pets` | Crea la ficha → `{ slug, edit_token }` (el token se muestra **una sola vez**) |
| `GET /api/pets/<slug>` | Datos públicos (sin `edit_token`) |
| `PUT /api/pets/<slug>` | Actualiza; exige `edit_token` correcto → si no, `403` |
| `GET /pet/<slug>` | Perfil público (rewrite → `/api/profile/<slug>`, HTML server-side) |
| `GET /api/qr/<slug>` | PNG del QR que apunta a `/pet/<slug>` (server-side, `qrcode` MIT). `?download=1` fuerza la descarga |
| `/pet/<slug>/edit` | Edición (token desde `localStorage` o `?token=`) |
| `/pet/<slug>/tag` | Página del collar: `<img>` contra `/api/qr/<slug>`, descarga PNG e impresión |

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

- **Supabase pausa proyectos inactivos** (~1 semana sin actividad) → un proyecto pausado deja el QR muerto. Mitigación: `.github/workflows/keepalive.yml` hace un ping diario a la app y otra contra la base (una lectura que devuelve 404). Si aun así se pausa, se restaura con un clic en el dashboard.
- **Vercel Hobby** es para uso personal/no comercial. Si esto se vuelve negocio, toca plan Pro.
- **Sin RLS en el prototipo**: `public.pets` tiene RLS deshabilitado. Como la única clave que existe es la `service_role` (que ignora RLS de todos modos) y el navegador jamás recibe una clave, el riesgo hoy es el de la API abierta: cualquiera puede crear fichas. Antes de exponer esto en serio: activar RLS + políticas y pasar a claves publicables + RPC.
- **Sin recuperación de token**: si se pierde, hay que editar la fila en Supabase o crear una ficha nueva (no hay login de dueños, decisión del prototipo).
- **Foto por URL**: la subida de archivos quedó fuera; `photo_url` es un enlace directo a una imagen.
- `GET /api/qr/<slug>` genera el PNG al vuelo a partir del host de la petición y lo cachea (1 h en navegador, 1 día en el borde de Vercel): si algún día cambia el dominio, el QR viejo puede servirse desde caché.
- El QR se dibuja en el servidor, no en el navegador: si el JS de la página del collar fallara, el QR sigue siendo accesible en `/api/qr/<slug>`.

## Fuera de alcance

NFC, GPS, RLS/multiusuario, login de dueños, notificaciones, hosting comercial.
