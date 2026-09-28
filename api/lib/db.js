import { createClient } from "@supabase/supabase-js";

let cached = null;

/**
 * Cliente Supabase con la service_role key.
 * La clave vive SOLO en las funciones serverless (env vars de Vercel);
 * el frontend nunca la ve.
 */
export function supabaseClient() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * Capa de datos. Los handlers dependen de esta interfaz, no de supabase-js:
 * en los tests se inyecta un store falso y no hace falta ni red ni credenciales.
 */
export const store = {
  async slugExists(slug) {
    const { data, error } = await supabaseClient()
      .from("pets")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { error };
    return { exists: Boolean(data) };
  },

  async insertPet(row) {
    const { error } = await supabaseClient().from("pets").insert(row);
    if (error) return { error };
    return {};
  },

  async getPet(slug) {
    const { data, error } = await supabaseClient()
      .from("pets")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { error };
    return { data };
  },

  async updatePet(slug, patch) {
    const { data, error } = await supabaseClient()
      .from("pets")
      .update(patch)
      .eq("slug", slug)
      .select("*")
      .maybeSingle();
    if (error) return { error };
    return { data };
  },
};

export default store;
