import { randomBytes } from "node:crypto";

/** Campos que se devuelven en las respuestas publicas (nunca edit_token). */
export const PUBLIC_COLUMNS = [
  "slug",
  "created_at",
  "name",
  "species",
  "breed",
  "age",
  "photo_url",
  "medical_notes",
  "owner_name",
  "owner_phone",
  "owner_note",
];

/** Campos que el dueño puede editar con su token. */
export const EDITABLE_FIELDS = [
  "name",
  "species",
  "breed",
  "age",
  "photo_url",
  "medical_notes",
  "owner_name",
  "owner_phone",
  "owner_note",
];

export const REQUIRED_ON_CREATE = ["name", "owner_name", "owner_phone"];
export const REQUIRED_IF_PRESENT = ["name", "owner_name", "owner_phone"];

/** "Mila!" -> "mila"; "Rocky el Perro" -> "rocky-el-perro"; acentos fuera. */
export function makeSlug(input) {
  const base = String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "mascota";
}

export function randomHex(bytes = 16) {
  return randomBytes(bytes).toString("hex");
}

/** Token de edicion: 32 caracteres hex. */
export function makeEditToken() {
  return randomHex(16);
}

/** "+57 300 123 4567" -> "https://wa.me/573001234567". */
export function waLink(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

/** Escapa texto para insertarlo en HTML. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL publica absoluta que codifica el QR. */
export function publicPetUrl(origin, slug) {
  return `${String(origin ?? "").replace(/\/+$/, "")}/pet/${encodeURIComponent(String(slug ?? ""))}`;
}

/** Origin absoluto de la peticion (Vercel manda host y x-forwarded-proto). */
export function requestOrigin(req) {
  const host = req?.headers?.host;
  if (!host) return "";
  const proto = String(req?.headers?.["x-forwarded-proto"] ?? "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

/** Quita edit_token y cualquier columna no publica. */
export function pickPublic(row) {
  const out = {};
  for (const key of PUBLIC_COLUMNS) {
    if (row?.[key] !== undefined) out[key] = row[key];
  }
  return out;
}

/** Solo los campos editables, normalizados a string (o null). */
export function pickEditable(body) {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (body?.[key] !== undefined) {
      out[key] = body[key] === null ? null : String(body[key]).trim();
    }
  }
  return out;
}

export function trimmedString(value) {
  return String(value ?? "").trim();
}
