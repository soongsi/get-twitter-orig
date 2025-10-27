import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".", // 현재 폴더를 루트로
  publicDir: "public",
  build: {
    outDir: "dist",
  },
});
