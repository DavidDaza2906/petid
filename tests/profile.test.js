import { describe, expect, it } from "vitest";
import { createProfileHandler } from "../api/profile/[slug].js";
import { fakeReq, fakeRes, fakeStore, samplePet } from "./fakes.js";

const get = async (slug, { store } = {}) => {
  const res = fakeRes();
  const used = store ?? fakeStore({ rows: { firulais: samplePet() } });
  await createProfileHandler({ store: used })(
    fakeReq({ method: "GET", query: { slug }, headers: { host: "petid.vercel.app" } }),
    res,
  );
  return { res, html: res.body, store: used };
};

describe("GET /api/profile/<slug>", () => {
  it("devuelve HTML con nombre, teléfono, link de WhatsApp y notas médicas", async () => {
    const { res, html } = await get("firulais");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(html).toContain("Firulais");
    expect(html).toContain("+57 300 123 4567");
    expect(html).toContain("https://wa.me/573001234567");
    expect(html).toContain("Alérgica a la penicilina");
    expect(html).toContain("Criolla");
  });

  it("NUNCA expone el edit_token", async () => {
    const { html } = await get("firulais");
    expect(html).not.toContain(samplePet().edit_token);
    expect(html).not.toContain("edit_token");
  });

  it("escapa el HTML de los campos del usuario", async () => {
    const store = fakeStore({
      rows: {
        firulais: samplePet({ name: '<img src=x onerror="alert(1)">', owner_note: "<b>mal</b>" }),
      },
    });
    const { html } = await get("firulais", { store });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>mal</b>");
    expect(html).toContain("&lt;img src=x");
  });

  it("404 con HTML si no existe", async () => {
    const res = fakeRes();
    await createProfileHandler({ store: fakeStore() })(
      fakeReq({ method: "GET", query: { slug: "nadie" }, headers: {} }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("No encontramos esta ficha");
  });
});
