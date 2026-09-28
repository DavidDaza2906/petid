import { describe, expect, it } from "vitest";
import { createPetsHandler } from "../api/pets.js";
import { createPetHandler } from "../api/pets/[slug].js";
import { createProfileHandler } from "../api/profile/[slug].js";
import { fakeReq, fakeRes, fakeStore, samplePet } from "./fakes.js";

/** Si la capa de datos revienta, la respuesta debe ser un error limpio, no un crash. */
const throwingStore = (message = "boom") => ({
  async slugExists() {
    throw new Error(message);
  },
  async insertPet() {
    throw new Error(message);
  },
  async getPet() {
    throw new Error(message);
  },
  async updatePet() {
    throw new Error(message);
  },
});

describe("resiliencia: la capa de datos falla", () => {
  it("POST /api/pets responde 500 en JSON", async () => {
    const res = fakeRes();
    await createPetsHandler({ store: throwingStore("sin credenciales") })(fakeReq({ method: "POST", body: samplePet() }), res);
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBeTruthy();
    expect(res.json().detail).toContain("sin credenciales");
  });

  it("GET /api/pets/<slug> responde 500 en JSON", async () => {
    const res = fakeRes();
    await createPetHandler({ store: throwingStore() })(fakeReq({ method: "GET", query: { slug: "firulais" } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("read_failed");
  });

  it("PUT /api/pets/<slug> responde 500 en JSON cuando falla la escritura", async () => {
    const pet = samplePet();
    const store = fakeStore({ rows: { firulais: pet } });
    store.updatePet = async () => {
      throw new Error("update boom");
    };
    const res = fakeRes();
    await createPetHandler({ store })(fakeReq({ method: "PUT", query: { slug: "firulais" }, body: { edit_token: pet.edit_token, breed: "mestiza" } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("update_failed");
  });

  it("GET /pet/<slug> responde 500 en HTML", async () => {
    const res = fakeRes();
    await createProfileHandler({ store: throwingStore() })(fakeReq({ method: "GET", query: { slug: "firulais" } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("Algo fall");
    expect(res.body).not.toContain("boom");
  });
});
