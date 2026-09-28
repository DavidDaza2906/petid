import { pickEditable, pickPublic, REQUIRED_IF_PRESENT, trimmedString } from "../lib/helpers.js";
import { store as defaultStore } from "../lib/db.js";
import { errorMessage, readJson, sendJson } from "../lib/http.js";

export function createPetHandler(deps = {}) {
  const store = deps.store ?? defaultStore;

  return async function handler(req, res) {
    const slug = trimmedString(req.query?.slug);
    if (!slug) return sendJson(res, 400, { error: "missing_slug" });

    const { data: pet, error } = await store.getPet(slug);
    if (error) return sendJson(res, 500, { error: "read_failed", detail: errorMessage(error) });
    if (!pet) return sendJson(res, 404, { error: "not_found" });

    if (req.method === "GET") {
      return sendJson(res, 200, { pet: pickPublic(pet) });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await readJson(req);
      const token = trimmedString(body?.edit_token ?? req.headers?.["x-edit-token"]);
      if (!token || token !== pet.edit_token) {
        return sendJson(res, 403, { error: "invalid_token" });
      }

      const patch = pickEditable(body);
      if (!Object.keys(patch).length) {
        return sendJson(res, 400, { error: "nothing_to_update" });
      }

      const emptied = REQUIRED_IF_PRESENT.filter((field) => field in patch && !patch[field]);
      if (emptied.length) {
        return sendJson(res, 400, { error: "missing_fields", required: emptied });
      }

      const { data: updated, error: updateError } = await store.updatePet(slug, patch);
      if (updateError) {
        return sendJson(res, 500, { error: "update_failed", detail: errorMessage(updateError) });
      }
      return sendJson(res, 200, { pet: pickPublic(updated ?? { ...pet, ...patch }) });
    }

    return sendJson(res, 405, { error: "method_not_allowed" });
  };
}

export default createPetHandler();
