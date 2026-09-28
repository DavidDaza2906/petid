import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { createQrHandler } from "../api/qr/[slug].js";
import { fakeReq, fakeRes, fakeStore, samplePet } from "./fakes.js";

const HOST = "petid-eight.vercel.app";
const EXPECTED_URL = `https://${HOST}/pet/firulais`;

const req = (over = {}) =>
  fakeReq({
    method: "GET",
    query: { slug: "firulais" },
    headers: { host: HOST, "x-forwarded-proto": "https" },
    ...over,
  });

const handlerWith = (over = {}) => createQrHandler({ store: fakeStore({ rows: { firulais: samplePet() } }), ...over });

/** Decodifica el PNG como lo haria un lector de QR. */
function decode(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return code?.data ?? null;
}

describe("GET /api/qr/<slug>", () => {
  it("devuelve un PNG que un lector decodifica a la URL publica de la ficha", async () => {
    const res = fakeRes();
    await handlerWith()(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(Buffer.isBuffer(res.body)).toBe(true);
    // Firma PNG: \x89PNG
    expect(res.body.subarray(0, 4).toString("hex")).toBe("89504e47");

    // La prueba de verdad: el QR se puede leer y lleva la URL correcta.
    expect(decode(res.body)).toBe(EXPECTED_URL);
  });

  it("el QR nunca lleva el edit_token", async () => {
    const res = fakeRes();
    await handlerWith()(req(), res);
    const payload = decode(res.body);

    expect(payload).not.toContain(samplePet().edit_token);
    expect(payload).not.toMatch(/[0-9a-f]{32}/);
  });

  it("usa el host y el protocolo de la peticion", async () => {
    const res = fakeRes();
    await handlerWith()(
      req({ headers: { host: "localhost:3000", "x-forwarded-proto": "http" } }),
      res,
    );
    expect(decode(res.body)).toBe("http://localhost:3000/pet/firulais");
  });

  it("marca la descarga cuando se pide ?download=1", async () => {
    const res = fakeRes();
    await handlerWith()(req({ query: { slug: "firulais", download: "1" } }), res);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="petid-qr-firulais.png"');
  });

  it("404 si la ficha no existe: no se imprime un QR que lleva a la nada", async () => {
    const res = fakeRes();
    await handlerWith()(req({ query: { slug: "no-existe" } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not_found" });
  });

  it("400 sin slug", async () => {
    const res = fakeRes();
    await handlerWith()(req({ query: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "missing_slug" });
  });

  it("405 en metodos que no son GET", async () => {
    const res = fakeRes();
    await handlerWith()(req({ method: "POST" }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("GET");
  });

  it("500 limpio si la capa de datos revienta", async () => {
    const store = {
      async getPet() {
        throw new Error("supabase caido");
      },
    };
    const res = fakeRes();
    await createQrHandler({ store })(req(), res);
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: "read_failed", detail: "supabase caido" });
  });

  it("500 limpio si el generador de QR revienta", async () => {
    const res = fakeRes();
    await handlerWith({
      render: () => {
        throw new Error("sin memoria");
      },
    })(req(), res);
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: "qr_failed" });
  });
});

describe("regresion: la pagina del collar no depende de un CDN", () => {
  const html = readFileSync(fileURLToPath(new URL("../public/tag.html", import.meta.url)), "utf8");

  it("no carga scripts de terceros", () => {
    expect(html).not.toMatch(/cdn\.jsdelivr|unpkg|cdnjs/);
    expect(html).not.toMatch(/<script src=/);
  });

  it("apunta la imagen al QR que genera nuestra API", () => {
    expect(html).toContain("/api/qr/");
  });
});
