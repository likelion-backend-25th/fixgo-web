import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// 브라우저는 같은 출처의 /api 로 호출하고, 개발 서버가 Spring Boot(8080)로 넘긴다.
// 로컬에서 CORS 없이 /api/v1 규칙을 지키기 위한 설정이다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
