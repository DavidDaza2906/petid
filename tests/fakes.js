/** Dobles de test: ni red, ni credenciales, ni Supabase real. */

export function fakeRes() {
  const res = {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      res.headers[String(key).toLowerCase()] = value;
    },
    end(chunk) {
      res.body = chunk ?? "";
      return res;
    },
  };
  res.json = () => {
    try {
      return JSON.parse(res.body);
    } catch {
      return null;
    }
  };
  return res;
}

export function fakeReq({ method = "GET", query = {}, body, headers = {} } = {}) {
  return { method, query, body, headers };
}

export function fakeStore({ rows = {} } = {}) {
  const table = new Map(Object.entries(rows));
  return {
    table,
    async slugExists(slug) {
      return { exists: table.has(slug) };
    },
    async insertPet(row) {
      if (table.has(row.slug)) return { error: new Error("duplicate key value violates unique constraint") };
      table.set(row.slug, { created_at: "2026-09-28T00:00:00.000Z", ...row });
      return {};
    },
    async getPet(slug) {
      return { data: table.get(slug) ?? null };
    },
    async updatePet(slug, patch) {
      const current = table.get(slug);
      if (!current) return { data: null };
      const next = { ...current, ...patch };
      table.set(slug, next);
      return { data: next };
    },
  };
}

export const samplePet = (overrides = {}) => ({
  slug: "mila",
  edit_token: "a".repeat(32),
  created_at: "2026-09-28T00:00:00.000Z",
  name: "Mila",
  species: "Perra",
  breed: "Criolla",
  age: "3 años",
  photo_url: "https://example.com/mila.jpg",
  medical_notes: "Alérgica a la penicilina",
  owner_name: "Daw",
  owner_phone: "+57 300 123 4567",
  owner_note: "Muy juguetona",
  ...overrides,
});
