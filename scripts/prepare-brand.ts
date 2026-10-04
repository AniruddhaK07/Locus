import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

async function main() {
  const root = process.cwd();
  const brandDir = path.resolve(root, "src/ui/assets/brand");
  const publicDir = path.resolve(root, "public");

  const logoSrc = path.join(brandDir, "imglgo.png");
  const teamSrc = path.join(brandDir, "ud.png");

  if (!fs.existsSync(logoSrc) || !fs.existsSync(teamSrc)) {
    throw new Error("Missing source brand images in src/ui/assets/brand/");
  }

  console.log("Analyzing imglgo.png...");
  const logoMeta = await sharp(logoSrc).metadata();
  console.log(`- Dimensions: ${logoMeta.width}x${logoMeta.height}, Channels: ${logoMeta.channels}, Alpha: ${logoMeta.hasAlpha}`);

  // Trim transparent borders and center within a square with safe margins
  const trimmed = await sharp(logoSrc).trim().toBuffer({ resolveWithObject: true });
  console.log(`- Trimmed content bounds: ${trimmed.info.width}x${trimmed.info.height}`);

  // Create crisp 256x256 mark derivative
  const markOut = path.join(brandDir, "locus-mark.png");
  await sharp(trimmed.data)
    .extend({
      top: 24,
      bottom: 24,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(markOut);
  console.log(`✓ Generated ${markOut} (${fs.statSync(markOut).size} bytes)`);

  // Favicon (32x32) and apple-touch-icon (180x180)
  const faviconOut = path.join(publicDir, "favicon.png");
  await sharp(markOut).resize(32, 32).png().toFile(faviconOut);
  console.log(`✓ Generated ${faviconOut}`);

  const appleTouchOut = path.join(publicDir, "apple-touch-icon.png");
  await sharp(markOut).resize(180, 180).png().toFile(appleTouchOut);
  console.log(`✓ Generated ${appleTouchOut}`);

  // Team badge (ud.png) derivative: ~2x display width (340px)
  console.log("Processing ud.png (Meridian team badge)...");
  const teamWebpOut = path.join(brandDir, "meridian-badge.webp");
  await sharp(teamSrc)
    .resize(340)
    .webp({ quality: 85 })
    .toFile(teamWebpOut);
  console.log(`✓ Generated ${teamWebpOut} (${fs.statSync(teamWebpOut).size} bytes, down from ${fs.statSync(teamSrc).size} bytes)`);

  const teamPngOut = path.join(brandDir, "meridian-badge.png");
  await sharp(teamSrc)
    .resize(340)
    .png({ compressionLevel: 9 })
    .toFile(teamPngOut);
  console.log(`✓ Generated ${teamPngOut} (${fs.statSync(teamPngOut).size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
