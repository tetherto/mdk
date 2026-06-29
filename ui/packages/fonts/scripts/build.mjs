import { compile } from "sass";
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const distDir = resolve(root, "dist");

rmSync(distDir, { recursive: true, force: true });
mkdirSync(resolve(distDir, "fonts"), { recursive: true });

const { css } = compile(resolve(srcDir, "jetbrains-mono.scss"));
writeFileSync(resolve(distDir, "jetbrains-mono.css"), css);

for (const file of readdirSync(resolve(srcDir, "fonts"))) {
  copyFileSync(resolve(srcDir, "fonts", file), resolve(distDir, "fonts", file));
}

console.log("✓ @tetherto/mdk-fonts built successfully");
