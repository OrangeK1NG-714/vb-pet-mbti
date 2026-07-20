import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("端口必须是 1 到 65535 的整数");

async function existingFile(pathname) {
  const requested = resolve(ROOT, `.${pathname}`);
  if (requested !== ROOT && !requested.startsWith(`${ROOT}${sep}`)) return null;
  try {
    const info = await stat(requested);
    if (info.isDirectory()) return existingFile(`${pathname.replace(/\/$/, "")}/index.html`);
    return info.isFile() ? requested : null;
  } catch (_error) {
    return null;
  }
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname);
  } catch (_error) {
    response.writeHead(400).end("Bad Request");
    return;
  }

  const file = await existingFile(pathname);
  const target = file || resolve(ROOT, "404.html");
  const status = file ? 200 : 404;
  response.writeHead(status, {
    "content-type": TYPES[extname(target)] || "application/octet-stream",
    "cache-control": target.endsWith(".html") ? "no-cache" : "public, max-age=3600",
    "x-content-type-options": "nosniff"
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(target).pipe(response);
});

server.listen(port, host, () => console.log(`Pet MBTI preview: http://${host}:${port}`));
