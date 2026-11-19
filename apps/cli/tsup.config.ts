import { defineConfig } from "tsup";

export default defineConfig({
  entry: { bin: "src/bin.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  // The workspace packages ship TypeScript source, so bundle them into the binary.
  noExternal: [/^@forge\//],
});
