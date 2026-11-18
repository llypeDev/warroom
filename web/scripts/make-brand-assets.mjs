// Gera os assets de marca do WARROOM a partir do original em
// web/assets/brand/warroom-black.png (PNG com fundo transparente).
//
// Rode de web/:  node scripts/make-brand-assets.mjs
//
// Saída:
//   public/logo.png       arte preta  — tema claro (sidebar)
//   public/logo-dark.png  arte branca — tema escuro e hero do login
//   src/app/icon.png      tile escuro — ícone do app
//   src/app/favicon.ico   tile escuro 256px embutido em ICO
//
// A variante branca é a preta com o RGB negado, e não o arquivo
// warroom-white.png: aquele arquivo tem a silhueta diferente (as áreas cheias
// viram contorno), o que deixa a arte oca quando aplicada sobre fundo escuro.
//
// O canvas de saída é quadrado e o conteúdo é centralizado com 8% de margem.

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets", "brand");

const INK = "#0B0D12";
const LOGO_SIZE = 1024;
const PADDING = 0.08; // fração do lado

// Recorta a arte na bounding box do alpha e devolve um PNG justo no conteúdo.
async function trimToContent(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(`arte vazia: ${file}`);

  return sharp(file).ensureAlpha().extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

// Arte ajustada dentro de um quadrado transparente de `size`.
// `negate` troca preto por branco mantendo o alpha intacto.
async function squareLogo(file, size, negate = false) {
  const inner = Math.round(size * (1 - PADDING * 2));
  let trimmed = await trimToContent(file);
  if (negate) trimmed = sharp(await trimmed.png().toBuffer()).negate({ alpha: false });
  const art = await trimmed
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: art, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Tile opaco com cantos arredondados + arte branca centralizada.
async function tile(size, iconScale) {
  const radius = Math.round(size * (72 / 512));
  const base = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
       <rect width="512" height="512" rx="${Math.round(radius * (512 / size))}" fill="${INK}"/>
     </svg>`,
  );

  const inner = Math.round(size * iconScale);
  const trimmed = await trimToContent(join(SRC, "warroom-black.png"));
  const art = await sharp(await trimmed.png().toBuffer())
    .negate({ alpha: false })
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: art, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ICO com um único PNG embutido (browsers e Windows Vista+).
function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // 0 => 256px
  entry.writeUInt8(0, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

async function main() {
  const publicDir = join(ROOT, "public");
  const appDir = join(ROOT, "src", "app");
  await mkdir(publicDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  await sharp(await squareLogo(join(SRC, "warroom-black.png"), LOGO_SIZE)).toFile(join(publicDir, "logo.png"));
  await sharp(await squareLogo(join(SRC, "warroom-black.png"), LOGO_SIZE, true)).toFile(
    join(publicDir, "logo-dark.png"),
  );

  await sharp(await tile(512, 0.74)).toFile(join(appDir, "icon.png"));
  await sharp(await tile(256, 0.74)).toBuffer().then(async (png) => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(appDir, "favicon.ico"), pngToIco(png));
  });

  console.log("ok: public/logo.png, public/logo-dark.png, src/app/icon.png, src/app/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
