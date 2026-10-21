import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        notebook: resolve(import.meta.dirname, "caderno.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
      },
    },
  },
});
