import QRCode from "qrcode";
import { publicPetUrl, requestOrigin, trimmedString } from "../lib/helpers.js";
import { store as defaultStore } from "../lib/db.js";
import { attempt, errorMessage, sendJson } from "../lib/http.js";

/**
 * QR del collar, generado en el servidor con `qrcode` (MIT).
 *
 * Antes se dibujaba en el navegador con la misma libreria traida de un CDN: si el
 * CDN fallaba (y fallaba: la ruta daba 404), no habia QR. Aqui no hay dependencia
 * de red en el cliente: la pagina del collar solo pone un <img> a este endpoint.
 *
 * Correccion de errores "H" = hasta 30% del codigo puede estar tapado o sucio,
 * que es justo lo que le pasa a una placa en un collar.
 */
export const QR_OPTIONS = {
  type: "png",
  errorCorrectionLevel: "H",
  margin: 2,
  width: 640,
  color: { dark: "#000000ff", light: "#ffffffff" },
};

export function createQrHandler(deps = {}) {
  const store = deps.store ?? defaultStore;
  const render = deps.render ?? ((text) => QRCode.toBuffer(text, QR_OPTIONS));

  return async function handler(req, res) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendJson(res, 405, { error: "method_not_allowed" });
    }

    const slug = trimmedString(req.query?.slug);
    if (!slug) return sendJson(res, 400, { error: "missing_slug" });

    // No se imprime un QR que apunte a una ficha inexistente.
    const { data: pet, error: readError } = await attempt(() => store.getPet(slug));
    if (readError) return sendJson(res, 500, { error: "read_failed", detail: errorMessage(readError) });
    if (!pet) return sendJson(res, 404, { error: "not_found" });

    // Vercel manda host; el fallback cubre llamadas sin cabecera (tests, jobs internos).
    const origin = requestOrigin(req) || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const url = publicPetUrl(origin, slug);
    const png = await attempt(() => render(url));
    if (png?.error) return sendJson(res, 500, { error: "qr_failed", detail: errorMessage(png.error) });

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", Buffer.byteLength(png));
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    if (trimmedString(req.query?.download)) {
      res.setHeader("Content-Disposition", `attachment; filename="petid-qr-${slug}.png"`);
    }
    res.end(png);
    return res;
  };
}

export default createQrHandler();
