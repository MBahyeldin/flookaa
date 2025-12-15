import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "https://lxd-development-app",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // 👈 rewrites cookie domain
      },
      "/query": {
        target: process.env.VITE_API_BASE_URL || "https://lxd-development-app",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // 👈 rewrites cookie domain
      },
      "/ws": {
        target: process.env.VITE_WEBSOCKET_BASE_URL || "ws://lxd-development-app",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // 👈 rewrites cookie domain
      },
    },
  },
});
