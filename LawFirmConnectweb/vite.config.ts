import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load the root .env file to get APPLICATION_ENV
  const rootEnv = loadEnv(mode, path.resolve(__dirname, ".."), [
    "APPLICATION_ENV",
  ]);
  const appEnv = rootEnv.APPLICATION_ENV || "development";

  console.log(`Vite running in ${appEnv} mode (from root .env)`);

  return {
    plugins: [react(), tailwindcss()],
    envDir: "../",
    mode: appEnv, // Force Vite to use the mode from .env
  };
});
