import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import type { ServerResponse } from "node:http";
import path from "node:path";
import { defineConfig, type ProxyOptions } from "vite";
import { securityHeaderMap } from "./shared/security-headers";

/**
 * Express already honors DOTENV_CONFIG_PATH (IMPORTANT PAPERS .env).
 * Vite only reads envDir/.env unless we load that file first. Without it,
 * /admin and /login render “set VITE_SUPABASE_*” even when the API is configured.
 */
if (process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });
}

const repoRoot = path.resolve(import.meta.dirname);
const PROXY_ERROR_BODY = JSON.stringify({
  error: "Something went wrong.",
  code: "internal_error",
});

function toExpress(): ProxyOptions {
  return {
    target: "http://127.0.0.1:3001",
    changeOrigin: true,
    configure(proxy) {
      proxy.on("error", (_err, _req, res) => {
        if (!res || typeof (res as ServerResponse).writeHead !== "function") return;
        const httpRes = res as ServerResponse;
        if (httpRes.headersSent) return;
        httpRes.writeHead(502, { "Content-Type": "application/json" });
        httpRes.end(PROXY_ERROR_BODY);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "client", "src"),
      "@shared": path.resolve(repoRoot, "shared"),
    },
  },
  envDir: repoRoot,
  root: path.resolve(repoRoot, "client"),
  build: {
    outDir: path.resolve(repoRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    headers: securityHeaderMap({ production: false, hsts: false }),
    proxy: {
      "/api": toExpress(),
      "/sitemap.xml": toExpress(),
      "/robots.txt": toExpress(),
      "/llms.txt": toExpress(),
      "/llms-full.txt": toExpress(),
      "/ai.txt": toExpress(),
    },
    fs: {
      strict: true,
      allow: [repoRoot],
      deny: ["**/.*"],
    },
  },
});
