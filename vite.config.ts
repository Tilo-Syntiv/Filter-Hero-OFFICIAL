import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "node:path";
import { defineConfig } from "vite";
import { securityHeaderMap } from "./shared/security-headers";

/**
 * Express already honors DOTENV_CONFIG_PATH (IMPORTANT PAPERS .env).
 * Vite only reads envDir/.env unless we load that file first. Without it,
 * /admin and /login render “set VITE_SUPABASE_*” even when the API is configured.
 */
if (process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });
}

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
