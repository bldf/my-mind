import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/my-mind/playground/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@my-mind-node/react/styles.css", replacement: fileURLToPath(new URL("../../packages/react/src/styles.css", import.meta.url)) },
      { find: "@my-mind-node/core", replacement: fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)) },
      { find: "@my-mind-node/react", replacement: fileURLToPath(new URL("../../packages/react/src/index.ts", import.meta.url)) },
      { find: "@my-mind-node/importers", replacement: fileURLToPath(new URL("../../packages/importers/src/index.ts", import.meta.url)) },
      { find: "@my-mind-node/exporters", replacement: fileURLToPath(new URL("../../packages/exporters/src/index.ts", import.meta.url)) },
    ],
  },
  server: {
    port: 5187,
    strictPort: true,
  },
});
