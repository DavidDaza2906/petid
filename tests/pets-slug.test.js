import { describe, expect, it } from "vitest";
import { createPetHandler } from "../api/pets/[slug].js";
import { fakeReq, fakeRes, fakeStore, samplePet } from "./fakes.js";

const call = async (method, { body, headers, store } = {}) => {
  const res = fakeRes();
  const used = store ?? fakeStore({ rows: { mila: samplePet() } });
  await createPetHandler({ store: used })(
    fakeReq({ method, query: { slug: "mila" }, body, headers }),
    res,
  );
  return { res, payload: res.json(), store: used };
};

describe("GET /api/pets/<slug>", () => {
  it("devuelve los campos públicos SIN edit_token", async () => {
    const { res, payload } = await call("GET");
    expect(res.statusCode).toBe(200);
    expect(payload.pet.name).toBe("Mila");
    expect(payload.pet.owner_phone).toBe("+57 300 123 4567");
    expect(payload.pet.edit_token).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain(samplePet().edit_token);
  });

  it("404 si la ficha no existe", async () => {
    const res = fakeRes();
    await createPetHandler({ store: fakeStore() })(
      fakeReq({ method: "GET", query: { slug: "nadie" } }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_found");
  });
});

describe("PUT /api/pets/<slug>", () => {
  it("403 sin token", async () => {
    const { res, payload } = await call("PUT", { body: { name: "Otra" } });
    expect(res.statusCode).toBe(403);
    expect(payload.error).toBe("invalid_token");
  });

  it("403 con token incorrecto", async () => {
    const { res } = await call("PUT", { body: { edit_token: "b".repeat(32), name: "Otra" } });
    expect(res.statusCode).toBe(403);
  });

  it("no deja cambiar el slug ni el token", async () => {
    const { res, store } = await call("PUT", {
      body: { edit_token: "a".repeat(32), slug: "otro", edit_token_nuevo: "x", name: "Mila II" },
    });
    expect(res.statusCode).toBe(200);
    const saved = store.table.get("mila");
    expect(saved.slug).toBe("mila");
    expect(saved.edit_token).toBe("a".repeat(32));
    expect(saved.name).toBe("Mila II");
  });

  it("con token correcto actualiza y devuelve la ficha pública", async () => {
    const { res, payload } = await call("PUT", {
      body: { edit_token: "a".repeat(32), medical_notes: "Operada de la cadera" },
    });
    expect(res.statusCode).toBe(200);
    expect(payload.pet.medical_notes).toBe("Operada de la cadera");
    expect(payload.pet.edit_token).toBeUndefined();
  });

  it("acepta el token por la cabecera x-edit-token", async () => {
    const { res } = await call("PUT", {
      body: { age: "4 años" },
      headers: { "x-edit-token": "a".repeat(32) },
    });
    expect(res.statusCode).toBe(200);
  });

  it("400 si el cuerpo no trae ningún campo editable", async () => {
    const { res, payload } = await call("PUT", { body: { edit_token: "a".repeat(32) } });
    expect(res.statusCode).toBe(400);
    expect(payload.error).toBe("nothing_to_update");
  });

  it("400 si se intenta vaciar un campo obligatorio", async () => {
    const { res, payload } = await call("PUT", {
      body: { edit_token: "a".repeat(32), owner_phone: "   " },
    });
    expect(res.statusCode).toBe(400);
    expect(payload.required).toEqual(["owner_phone"]);
  });
});
