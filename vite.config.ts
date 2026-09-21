import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { securityHeaderMap } from "./shared/security-headers";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    headers: securityHeaderMap({ production: false, hsts: false }),
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/robots.txt": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/llms.txt": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/llms-full.txt": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/ai.txt": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
