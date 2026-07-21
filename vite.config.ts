import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8082,
    strictPort: true,
    proxy: {
      // In dev, use /api-admin to avoid CORS when uploading to admin API
      "/api-admin": {
        target: "https://superadminapi.villagkart.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api-admin/, "/api/v1"),
      },
    },
  },
});
