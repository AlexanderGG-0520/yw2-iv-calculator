import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist-server",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: "server/index.ts",
        "reverseSearch.worker": "server/reverseSearch.worker.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
