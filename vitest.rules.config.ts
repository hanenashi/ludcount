import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["rules/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 20_000,
    testTimeout: 10_000,
  },
});
