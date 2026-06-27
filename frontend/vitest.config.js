import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.js"],
    include: ["src/__tests__/**/*.test.jsx", "src/__tests__/**/*.test.js"],
    css: { modules: { classNameStrategy: "non-scoped" } },
    teardownTimeout: 1000,
  },
});
