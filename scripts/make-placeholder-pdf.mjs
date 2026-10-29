// Writes a one-page placeholder PDF used by every "After the story" resource
// until Bharathi's real cards are uploaded. No dependencies.
// Usage: node scripts/make-placeholder-pdf.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const lines = [
  ["F2", 22, "[CONTENT NEEDED]"],
  ["F1", 16, "After the story card"],
  ["F1", 12, "This is a placeholder. The real card will have three to five"],
  ["F1", 12, "questions to ask once the last page is turned."],
  ["F1", 10, "Gudiya Stories, Tirupati"],
];

const esc = (s) => s.replace(/[\\()]/g, "\\$&");
let y = 760;
const stream = lines
  .map(([font, size, text]) => {
    const line = `BT /${font} ${size} Tf 72 ${y} Td (${esc(text)}) Tj ET`;
    y -= size + 18;
    return line;
  })
  .join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

mkdirSync("public/resources", { recursive: true });
writeFileSync("public/resources/after-the-story-placeholder.pdf", pdf);
console.log("Wrote public/resources/after-the-story-placeholder.pdf");
