import { esc, pickPublic, publicPetUrl, trimmedString, waLink } from "../lib/helpers.js";
import { store as defaultStore } from "../lib/db.js";
import { attempt, errorMessage, sendHtml } from "../lib/http.js";

function line(label, value) {
  if (!value) return "";
  return `<div class="row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function notFoundPage(slug) {
  return page({
    title: "Mascota no encontrada",
    body: `<section class="card">
      <h1>No encontramos esta ficha</h1>
      <p>La ficha <code>${esc(slug)}</code> no existe o fue borrada.</p>
      <p><a class="btn" href="/">Crear una ficha nueva</a></p>
    </section>`,
  });
}

function petPage(pet, requestOrigin) {
  const url = publicPetUrl(requestOrigin, pet.slug);
  const wa = waLink(pet.owner_phone);
  const photo = pet.photo_url
    ? `<img class="photo" src="${esc(pet.photo_url)}" alt="${esc(pet.name)}" loading="lazy" onerror="this.remove()">`
    : "";

  const medical = pet.medical_notes
    ? `<section class="card alert">
        <h2>Notas médicas</h2>
        <p>${esc(pet.medical_notes)}</p>
      </section>`
    : "";

  const ownerNote = pet.owner_note
    ? `<section class="card">
        <h2>Sobre ${esc(pet.name)}</h2>
        <p>${esc(pet.owner_note)}</p>
      </section>`
    : "";

  const waButton = wa
    ? `<a class="btn wa" href="${esc(wa)}" rel="noopener">Escribirle a ${esc(pet.owner_name)} por WhatsApp</a>`
    : `<p class="muted">El dueño no dejó teléfono de contacto.</p>`;

  const body = `
    <section class="card hero">
      ${photo}
      <h1>${esc(pet.name)}</h1>
      <p class="muted">${[pet.species, pet.breed, pet.age].filter(Boolean).map(esc).join(" · ")}</p>
      <p class="found">Si encontraste a esta mascota, avisa a su familia:</p>
      ${waButton}
    </section>
    <section class="card">
      <h2>Ficha</h2>
      <dl>
        ${line("Dueño", pet.owner_name)}
        ${line("Teléfono", pet.owner_phone)}
        ${line("Especie", pet.species)}
        ${line("Raza", pet.breed)}
        ${line("Edad", pet.age)}
      </dl>
    </section>
    ${medical}
    ${ownerNote}
    <footer class="muted small">
      <p>PETID · ficha pública: <code>${esc(url)}</code></p>
      <p><a href="/pet/${esc(pet.slug)}/edit">Editar esta ficha</a></p>
    </footer>`;

  return page({ title: `${pet.name} — PETID`, body });
}

function page({ title, body }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="topbar"><a href="/" class="brand">PETID</a></header>
<main>${body}</main>
</body>
</html>`;
}

export function createProfileHandler(deps = {}) {
  const store = deps.store ?? defaultStore;

  return async function handler(req, res) {
    if (req.method !== "GET") {
      return sendHtml(res, 405, page({ title: "Método no permitido", body: "" }));
    }

    const slug = trimmedString(req.query?.slug);
    if (!slug) return sendHtml(res, 404, notFoundPage(slug));

    const { data: pet, error } = await attempt(() => store.getPet(slug));
    if (error) {
      return sendHtml(
        res,
        500,
        page({ title: "Error temporal", body: `<section class="card"><h1>Algo falló</h1><p>Vuelve a intentarlo en un momento.</p></section>` }),
      );
    }
    if (!pet) return sendHtml(res, 404, notFoundPage(slug));

    const host = req.headers?.host ?? "";
    const proto = req.headers?.["x-forwarded-proto"] ?? "https";
    const origin = host ? `${proto}://${host}` : "";

    // pickPublic garantiza que edit_token nunca entra en el HTML.
    return sendHtml(res, 200, petPage(pickPublic(pet), origin));
  };
}

export default createProfileHandler();
