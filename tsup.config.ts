import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  clean: true,
  minify: true,
  sourcemap: true,
});
