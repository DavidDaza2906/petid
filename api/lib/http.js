/** Helpers de HTTP sin framework: sirven igual en Vercel y en los tests. */

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") return req.body;
    try {
      return JSON.parse(String(req.body));
    } catch {
      return null;
    }
  }
  if (typeof req.on !== "function") return null;
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
  return res;
}

export function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
  return res;
}

export function sendText(res, status, text) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
  return res;
}

export function errorMessage(error) {
  if (!error) return "unknown_error";
  return error.message ?? String(error);
}

/** Ejecuta una operación de la capa de datos y convierte un throw en { error }. */
export async function attempt(operation) {
  try {
    return await operation();
  } catch (error) {
    return { error };
  }
}
