// Derives interim logo files from the client's PNG without redrawing it.
// - Cuts away the old green-gradient and gold-star frame.
// - Turns the white panel transparent so the logo sits on the paper colour.
// - Produces a compact mark (doll + book) by masking out the wordmark.
// - Prints the sampled logo green for the --lime token.
// Replace these with the layered SVG when it is available.
//
// Usage: node scripts/derive-brand.mjs
import sharp from "sharp";
import path from "node:path";

const SRC = "assets-inbox/gudiya-stories.png";
const OUT = "public/brand";

// Inner white panel of the original 1000x1000 file.
const PANEL = { left: 30, top: 140, width: 940, height: 745 };

// Keep-areas for the compact mark, in original coordinates.
const MARK_KEEP = [
  { x0: 362, y0: 300, x1: 648, y1: 790 }, // doll
  { x0: 165, y0: 498, x1: 370, y1: 790 }, // left page and butterfly
  { x0: 640, y0: 536, x1: 832, y1: 790 }, // right page, hand and butterfly
];
const MARK_BOX = { left: 165, top: 300, width: 667, height: 490 };

async function loadRaw() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** White -> transparent with a soft edge, so anti-aliasing stays smooth. */
function knockOutWhite(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    // Only near-neutral, light pixels become transparent.
    if (max - min < 40 && min > 200) {
      const a = Math.round(((255 - min) / 55) * 255);
      data[i + 3] = Math.max(0, Math.min(255, a));
    }
  }
}

function sampleLime(data, width, box) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = box.top; y < box.top + box.height; y++) {
    for (let x = box.left; x < box.left + box.width; x++) {
      const i = (y * width + x) * 4;
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      // Saturated logo green only.
      if (pg > 170 && pg - pr > 70 && pg - pb > 120) {
        r += pr; g += pg; b += pb; n++;
      }
    }
  }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

async function main() {
  const { data, width, height } = await loadRaw();
  const lime = sampleLime(data, width, PANEL);

  const transparent = Buffer.from(data);
  knockOutWhite(transparent);

  const raw = { raw: { width, height, channels: 4 } };

  await sharp(transparent, raw).extract(PANEL).png().toFile(path.join(OUT, "gudiya-stories-lockup.png"));

  const masked = Buffer.from(transparent);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const keep = MARK_KEEP.some((k) => x >= k.x0 && x < k.x1 && y >= k.y0 && y < k.y1);
      if (!keep) masked[(y * width + x) * 4 + 3] = 0;
    }
  }
  await sharp(masked, raw).extract(MARK_BOX).png().toFile(path.join(OUT, "gudiya-stories-mark.png"));

  // Square favicon/OG source with the mark centred on paper.
  const mark = await sharp(masked, raw).extract(MARK_BOX).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#FBF8F1" } })
    .composite([{ input: await sharp(mark).resize(440, 440, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(), gravity: "center" }])
    .png()
    .toFile("src/app/icon.png");

  console.log(`Sampled logo green (--lime): ${lime}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
