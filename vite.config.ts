import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

/**
 * Default build: a static multi-page site (GitHub Pages)
 *   /             launch screen
 *   /electrical/  /pneumatic/  /hydraulic/   one page per program, shared code split into common chunks
 * SINGLE=1: everything in one self-contained dist/single.html (claude.ai artifact).
 */
const single = !!process.env.SINGLE;
export default defineConfig({
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  base: "./",
  build: {
    outDir: single ? "dist-single" : "dist",
    rollupOptions: {
      input: single
        ? { single: resolve(__dirname, "single.html") }
        : {
            main: resolve(__dirname, "index.html"),
            electrical: resolve(__dirname, "electrical/index.html"),
            pneumatic: resolve(__dirname, "pneumatic/index.html"),
            hydraulic: resolve(__dirname, "hydraulic/index.html"),
          },
      output: single ? undefined : {
        manualChunks(id) {
          if (id.includes("node_modules")) return "react";
          if (id.includes("/src/shared/") || id.includes("/src/platform/") || id.endsWith("styles.css")) return "shared";
        },
      },
    },
  },
  test: { environment: "node" },
});
