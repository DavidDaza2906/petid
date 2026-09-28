import {
  makeEditToken,
  makeSlug,
  pickEditable,
  pickPublic,
  randomHex,
  REQUIRED_ON_CREATE,
  trimmedString,
} from "./lib/helpers.js";
import { store as defaultStore } from "./lib/db.js";
import { errorMessage, readJson, sendJson } from "./lib/http.js";

const MAX_SLUG_ATTEMPTS = 6;

async function uniqueSlug(base, store) {
  let candidate = base;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const { exists, error } = await store.slugExists(candidate);
    if (error) throw error;
    if (!exists) return candidate;
    candidate = `${base}-${randomHex(2)}`;
  }
  throw new Error("no_free_slug");
}

export function createPetsHandler(deps = {}) {
  const store = deps.store ?? defaultStore;

  return async function handler(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "method_not_allowed" });
    }

    const body = await readJson(req);
    const values = {};
    for (const field of REQUIRED_ON_CREATE) values[field] = trimmedString(body?.[field]);

    const missing = REQUIRED_ON_CREATE.filter((field) => !values[field]);
    if (missing.length) {
      return sendJson(res, 400, { error: "missing_fields", required: missing });
    }

    const optional = pickEditable(body);
    delete optional.name;
    delete optional.owner_name;
    delete optional.owner_phone;

    let slug;
    try {
      slug = await uniqueSlug(makeSlug(values.name), store);
    } catch (error) {
      return sendJson(res, 500, { error: "slug_failed", detail: errorMessage(error) });
    }

    const edit_token = makeEditToken();
    const row = { slug, edit_token, ...values, ...optional };

    const { error } = await store.insertPet(row);
    if (error) {
      return sendJson(res, 500, { error: "insert_failed", detail: errorMessage(error) });
    }

    // El token se devuelve UNA sola vez: no vuelve a salir en GET.
    return sendJson(res, 201, { slug, edit_token, pet: pickPublic(row) });
  };
}

export default createPetsHandler();
