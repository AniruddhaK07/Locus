/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@engine": path.resolve(__dirname, "./src/engine/index.ts"),
      "@engine/": path.resolve(__dirname, "./src/engine/"),
      "@ui/": path.resolve(__dirname, "./src/ui/"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    env: {
      VITE_ENGINE_MODE: "mock",
    },
  },
});
