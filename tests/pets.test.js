import { describe, expect, it } from "vitest";
import { createPetsHandler } from "../api/pets.js";
import { fakeReq, fakeRes, fakeStore } from "./fakes.js";

const post = async (body, store = fakeStore()) => {
  const res = fakeRes();
  await createPetsHandler({ store })(fakeReq({ method: "POST", body }), res);
  return { res, store, payload: res.json() };
};

describe("POST /api/pets", () => {
  it("rechaza 400 si falta nombre, dueño o teléfono", async () => {
    const sinNombre = await post({ owner_name: "Daw", owner_phone: "+573001234567" });
    expect(sinNombre.res.statusCode).toBe(400);
    expect(sinNombre.payload.required).toEqual(["name"]);

    const vacio = await post({ name: "   ", owner_name: "Daw", owner_phone: "" });
    expect(vacio.res.statusCode).toBe(400);
    expect(vacio.payload.required).toEqual(["name", "owner_phone"]);
  });

  it("crea la mascota con slug y token, y no guarda el token en la respuesta pública", async () => {
    const { res, payload, store } = await post({
      name: "Mila",
      owner_name: "Daw",
      owner_phone: "+57 300 123 4567",
      species: "Perra",
      medical_notes: "Alérgica",
      edit_token: "inyectado-por-el-cliente",
    });

    expect(res.statusCode).toBe(201);
    expect(payload.slug).toBe("mila");
    expect(payload.edit_token).toMatch(/^[0-9a-f]{32}$/);
    expect(payload.edit_token).not.toBe("inyectado-por-el-cliente");
    expect(payload.pet.edit_token).toBeUndefined();

    const saved = store.table.get("mila");
    expect(saved.owner_phone).toBe("+57 300 123 4567");
    expect(saved.edit_token).toBe(payload.edit_token);
  });

  it("si el slug existe añade sufijo aleatorio en vez de sobrescribir", async () => {
    const store = fakeStore({ rows: { mila: { slug: "mila", edit_token: "otro" } } });
    const { res, payload, store: used } = await post(
      { name: "Mila", owner_name: "Daw", owner_phone: "+573001234567" },
      store,
    );

    expect(res.statusCode).toBe(201);
    expect(payload.slug).toMatch(/^mila-[0-9a-f]{4}$/);
    expect(used.table.get("mila").edit_token).toBe("otro");
    expect(used.table.size).toBe(2);
  });

  it("rechaza métodos distintos de POST", async () => {
    const res = fakeRes();
    await createPetsHandler({ store: fakeStore() })(fakeReq({ method: "GET" }), res);
    expect(res.statusCode).toBe(405);
  });

  it("responde 500 si la capa de datos falla", async () => {
    const store = {
      async slugExists() {
        return { exists: false };
      },
      async insertPet() {
        return { error: new Error("permission denied for table pets") };
      },
    };
    const res = fakeRes();
    await createPetsHandler({ store })(fakeReq({ method: "POST", body: { name: "Mila", owner_name: "Daw", owner_phone: "+573001234567" } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.json().detail).toContain("permission denied");
  });
});
