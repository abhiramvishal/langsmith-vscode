import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: [
    "src/extension.ts",
    "src/test/runTests.ts",
    "src/test/suite/index.ts",
    "src/test/suite/formatting.test.ts",
    "src/test/suite/langsmithClient.test.ts"
  ],
  bundle: true,
  format: "cjs",
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: "node",
  outdir: "dist",
  entryNames: "[dir]/[name]",
  external: ["vscode"],
  logLevel: "info",
});

  if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}

