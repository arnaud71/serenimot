import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const distDir = process.argv[2] ?? "dist";

const iconCopies = [
  ["public/icons/dev/icon.svg", "icons/icon.svg"],
  ["public/icons/dev/icon-192.png", "icons/icon-192.png"],
  ["public/icons/dev/icon-512.png", "icons/icon-512.png"],
  ["public/icons/dev/apple-touch-icon.png", "icons/apple-touch-icon.png"]
];

await Promise.all(iconCopies.map(([source, target]) => copyFile(source, join(distDir, target))));

const manifestPath = join(distDir, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

manifest.name = "Sérénimot Dev";
manifest.short_name = "Sérénimot Dev";
manifest.id = "ch.serenimot.app.dev";
manifest.description = `${manifest.description} Version de test.`;
manifest.theme_color = "#244a76";

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const indexPath = join(distDir, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const devIndexHtml = indexHtml
  .replace('<meta name="theme-color" content="#0f5f5c" />', '<meta name="theme-color" content="#244a76" />')
  .replace('<meta name="apple-mobile-web-app-title" content="Sérénimot" />', '<meta name="apple-mobile-web-app-title" content="Sérénimot Dev" />')
  .replace("<title>Sérénimot</title>", "<title>Sérénimot Dev</title>")
  .replace("</head>", '    <meta name="robots" content="noindex, nofollow" />\n  </head>');

await writeFile(indexPath, devIndexHtml);
