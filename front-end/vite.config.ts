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
      "/api/v1/upload": {
        target: "https://lxd-development-s3",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/audio": {
        target: "https://lxd-development-s3",
        changeOrigin: true,
        secure: false,
      },
      "/files": {
        target: "https://lxd-development-s3",
        changeOrigin: true,
        secure: false,
      },
      "/audio": {
        target: "https://lxd-development-s3",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "https://lxd-development-app",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // 👈 rewrites cookie domain
      },
      "/query": {
        target: "https://lxd-development-app",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // 👈 rewrites cookie domain
      },
      "/ws": {
        target: "ws://lxd-development:8080",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // 👈 rewrites cookie domain
      },
    },
  },
});
