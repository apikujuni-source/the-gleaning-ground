import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const VERSION = "20260723-cover-migration-1";
const publicRoots = ["_site", "_site/divine-blueprint-site"];

const retirementWorker = `/* Legacy site cache retirement: ${VERSION} */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.clients.claim();

    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    await self.registration.unregister();
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
`;

const cleanupScript = `<script id="legacy-service-worker-cleanup">
(() => {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    } catch (error) {
      console.warn("Legacy cache cleanup could not complete.", error);
    }
  }, { once: true });
})();
</script>`;

async function injectCleanup(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await injectCleanup(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const original = await readFile(path, "utf8");
    if (original.includes('id="legacy-service-worker-cleanup"')) continue;
    const updated = original.includes("</body>")
      ? original.replace("</body>", `${cleanupScript}\n</body>`)
      : `${original}\n${cleanupScript}\n`;
    await writeFile(path, updated, "utf8");
  }
}

for (const root of publicRoots) {
  if (!existsSync(root)) continue;
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "service-worker.js"), retirementWorker, "utf8");
  await injectCleanup(root);
}

console.log(`Installed legacy cache retirement ${VERSION} on both public origins.`);
