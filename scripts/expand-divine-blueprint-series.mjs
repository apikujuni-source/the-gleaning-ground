import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const seriesRoot = "content/divine-blueprint/series";
const teachingRoot = "content/divine-blueprint/teachings";
const generatedPrefix = "_series-";

await mkdir(teachingRoot, { recursive: true });

for (const name of await readdir(teachingRoot)) {
  if (name.startsWith(generatedPrefix) && name.endsWith(".json")) {
    await rm(join(teachingRoot, name), { force: true });
  }
}

if (!existsSync(seriesRoot)) {
  console.log("No Divine Blueprint 5-part series directory found; nothing to expand.");
  process.exit(0);
}

const seriesFiles = (await readdir(seriesRoot))
  .filter((name) => name.endsWith(".json"))
  .sort();

let generated = 0;

for (const name of seriesFiles) {
  const source = JSON.parse(await readFile(join(seriesRoot, name), "utf8"));
  const chapter = Number(source.chapter);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 9) continue;

  const episodes = Array.isArray(source.episodes) ? source.episodes : [];
  for (const episode of episodes) {
    if (episode.status !== "published") continue;

    const episodeNumber = Number(episode.episodeNumber);
    const title = String(episode.title || "").trim();
    if (!Number.isInteger(episodeNumber) || episodeNumber < 1 || !title) continue;

    const teaching = {
      title,
      chapter,
      episodeNumber,
      status: "published",
      publishDate: episode.publishDate || new Date().toISOString().slice(0, 10),
      format: episode.format || "Video Teaching",
      summary: episode.summary || "",
      speaker: episode.speaker || "Ayo-Paul Ikujuni",
      duration: episode.duration || "",
      seriesTitle: source.seriesTitle || `${source.chapterTitle || `Chapter ${chapter}`} — 5-Part Teaching Series`,
      featured: Boolean(episode.featured),
      thumbnail: episode.thumbnail || "",
      thumbnailAlt: episode.thumbnailAlt || "",
      videoUrl: episode.videoUrl || "",
      audioUrl: episode.audioUrl || "",
      mediaFile: episode.mediaFile || "",
      downloadFile: episode.downloadFile || "",
      externalUrl: episode.externalUrl || "",
      body: episode.body || ""
    };

    const outputName = `${generatedPrefix}chapter-${chapter}-part-${episodeNumber}.json`;
    await writeFile(join(teachingRoot, outputName), `${JSON.stringify(teaching, null, 2)}\n`, "utf8");
    generated += 1;
  }
}

console.log(`Expanded ${generated} published 5-part-series episode(s) into Divine Blueprint teaching entries.`);
