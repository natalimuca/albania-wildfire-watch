import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <path d="M256 96c40 64-24 88-24 144 0 44 36 80 80 80 20 0 38-6 52-18-8 40-56 96-124 96-72 0-136-56-136-136 0-96 76-140 76-208 0-24-8-44-8-44s84 20 84 86z" fill="#f97316"/>
  <path d="M256 220c16 28-8 40-8 64 0 20 16 36 36 36 10 0 18-3 24-8-6 24-32 52-64 52-36 0-64-28-64-64 0-44 36-64 36-96 0-10-4-18-4-18s40 8 40 34z" fill="#facc15"/>
</svg>
`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg.trim());

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(svg)).resize(32, 32).png().toFile("public/favicon-32.png");

console.log("Icons generated.");
