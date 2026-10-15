import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import radio from "./api/youtube/radio.js";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "YOUTUBE_");
  if (env.YOUTUBE_API_KEY) process.env.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY;
  return {
    plugins: [
      react(),
      {
        name: "radio-api",
        configureServer(server) {
          server.middlewares.use("/api/youtube/radio", (req, res) =>
            radio(req, res),
          );
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
