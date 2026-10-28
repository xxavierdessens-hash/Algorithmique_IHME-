import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/algorithmique-ihme/",
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET ||
            env.VITE_API_PROXY_TARGET ||
            "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
