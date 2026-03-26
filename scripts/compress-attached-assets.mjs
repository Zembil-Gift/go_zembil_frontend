#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const assetsDir = path.join(repoRoot, "public", "attached_assets");

const TARGETS = [
  { file: "go-gerami.png", maxWidth: 256, maxHeight: 256 },
  { file: "landing_page_img.png", maxWidth: 1200, maxHeight: 900 },
  { file: "new-baby.png", maxWidth: 640, maxHeight: 480 },
  { file: "promotion.png", maxWidth: 640, maxHeight: 480 },
  { file: "housewarming.png", maxWidth: 640, maxHeight: 480 },
  { file: "family-reunion.png", maxWidth: 640, maxHeight: 480 },
  { file: "graduation.png", maxWidth: 640, maxHeight: 480 },
  { file: "birthday.png", maxWidth: 640, maxHeight: 480 },
  { file: "wedding.png", maxWidth: 640, maxHeight: 480 },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let sharp;
  try {
    const sharpModule = await import("sharp");
    sharp = sharpModule.default;
  } catch {
    console.error("Missing dependency: sharp");
    console.error("Install it with: npm i -D sharp");
    process.exit(1);
  }

  const backupDir = path.join(
    assetsDir,
    `_backup_before_optimize_${Date.now().toString()}`
  );
  await fs.mkdir(backupDir, { recursive: true });

  let totalBefore = 0;
  let totalAfter = 0;
  const rows = [];

  for (const target of TARGETS) {
    const absolutePath = path.join(assetsDir, target.file);
    const exists = await ensureFileExists(absolutePath);

    if (!exists) {
      rows.push(`${target.file}: not found, skipped`);
      continue;
    }

    const sourceBuffer = await fs.readFile(absolutePath);
    const beforeStat = await fs.stat(absolutePath);
    totalBefore += beforeStat.size;

    const image = sharp(sourceBuffer, { animated: false });
    const metadata = await image.metadata();

    const optimizedBuffer = await image
      .resize({
        width: target.maxWidth,
        height: target.maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({
        compressionLevel: 9,
        effort: 10,
        adaptiveFiltering: true,
        palette: true,
        quality: 82,
      })
      .toBuffer();

    const optimizedMeta = await sharp(optimizedBuffer).metadata();

    await fs.copyFile(absolutePath, path.join(backupDir, target.file));
    await fs.writeFile(absolutePath, optimizedBuffer);

    const afterSize = optimizedBuffer.length;
    totalAfter += afterSize;
    const saved = Math.max(0, beforeStat.size - afterSize);
    const ratio = beforeStat.size
      ? ((saved / beforeStat.size) * 100).toFixed(1)
      : "0.0";

    rows.push(
      `${target.file}: ${metadata.width || "?"}x${metadata.height || "?"} -> ${optimizedMeta.width || "?"}x${optimizedMeta.height || "?"}, ${formatBytes(beforeStat.size)} -> ${formatBytes(afterSize)} (saved ${formatBytes(saved)}, ${ratio}%)`
    );
  }

  for (const row of rows) {
    console.log(row);
  }

  const totalSaved = Math.max(0, totalBefore - totalAfter);
  const totalRatio = totalBefore
    ? ((totalSaved / totalBefore) * 100).toFixed(1)
    : "0.0";

  console.log("---");
  console.log(`Backup directory: ${backupDir}`);
  console.log(
    `Total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} (saved ${formatBytes(totalSaved)}, ${totalRatio}%)`
  );
}

main().catch((error) => {
  console.error("Compression script failed:", error);
  process.exit(1);
});
