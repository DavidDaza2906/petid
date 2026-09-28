import { describe, expect, it } from "vitest";
import {
  esc,
  makeEditToken,
  makeSlug,
  pickEditable,
  pickPublic,
  publicPetUrl,
  waLink,
} from "../api/lib/helpers.js";

describe("makeSlug", () => {
  it("pasa a minusculas y quita signos", () => {
    expect(makeSlug("Mila!")).toBe("mila");
    expect(makeSlug("Rocky el Perro")).toBe("rocky-el-perro");
  });

  it("quita acentos y colapsa separadores", () => {
    expect(makeSlug("  Ñoño Pérez  ")).toBe("nono-perez");
    expect(makeSlug("Luna---Bella")).toBe("luna-bella");
  });

  it("cae a 'mascota' si no queda nada usable", () => {
    expect(makeSlug("!!!")).toBe("mascota");
    expect(makeSlug("")).toBe("mascota");
  });
});

describe("makeEditToken", () => {
  it("devuelve 32 chars hex", () => {
    expect(makeEditToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("no repite", () => {
    expect(makeEditToken()).not.toBe(makeEditToken());
  });
});

describe("waLink", () => {
  it("normaliza el telefono a wa.me", () => {
    expect(waLink("+57 300 123 4567")).toBe("https://wa.me/573001234567");
    expect(waLink("(300)-123-4567")).toBe("https://wa.me/3001234567");
  });

  it("devuelve vacio si no hay digitos", () => {
    expect(waLink("")).toBe("");
    expect(waLink(null)).toBe("");
  });
});

describe("esc", () => {
  it("escapa los caracteres peligrosos de HTML", () => {
    expect(esc('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(esc("Rocky & Mila's")).toBe("Rocky &amp; Mila&#39;s");
  });

  it("tolera null y undefined", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("publicPetUrl", () => {
  it("construye la URL publica del QR", () => {
    expect(publicPetUrl("https://petid.vercel.app", "mila")).toBe("https://petid.vercel.app/pet/mila");
  });

  it("no duplica la barra final del origin", () => {
    expect(publicPetUrl("https://petid.vercel.app/", "mila")).toBe(
      "https://petid.vercel.app/pet/mila",
    );
  });
});

describe("pickPublic / pickEditable", () => {
  it("pickPublic deja fuera edit_token", () => {
    const out = pickPublic({ slug: "mila", name: "Mila", edit_token: "secreto" });
    expect(out).toEqual({ slug: "mila", name: "Mila" });
    expect("edit_token" in out).toBe(false);
  });

  it("pickEditable solo acepta campos editables", () => {
    const out = pickEditable({ name: " Mila ", edit_token: "x", slug: "y", age: 3 });
    expect(out).toEqual({ name: "Mila", age: "3" });
  });
});
