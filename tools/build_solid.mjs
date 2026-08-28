import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

function requireEntry(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Expected one TypeScript application entry path.");
  }
  return value;
}

async function main() {
  const entry = requireEntry(process.argv[2]);
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    target: "es2020",
    platform: "browser",
    minify: true,
    sourcemap: true,
    outfile: "dist/main.js",
    plugins: [solidPlugin()],
  });
}

await main();
