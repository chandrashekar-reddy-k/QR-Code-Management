// vite.config.ts
import { defineConfig } from "file:///C:/Users/Nisha%20Reddy%20Teegala/Desktop/ERP/villagkart-partner-web/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Nisha%20Reddy%20Teegala/Desktop/ERP/villagkart-partner-web/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
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
        rewrite: (path) => path.replace(/^\/api-admin/, "/api/v1")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxOaXNoYSBSZWRkeSBUZWVnYWxhXFxcXERlc2t0b3BcXFxcRVJQXFxcXHZpbGxhZ2thcnQtcGFydG5lci13ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE5pc2hhIFJlZGR5IFRlZWdhbGFcXFxcRGVza3RvcFxcXFxFUlBcXFxcdmlsbGFna2FydC1wYXJ0bmVyLXdlYlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTmlzaGElMjBSZWRkeSUyMFRlZWdhbGEvRGVza3RvcC9FUlAvdmlsbGFna2FydC1wYXJ0bmVyLXdlYi92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogODA4MixcclxuICAgIHN0cmljdFBvcnQ6IHRydWUsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAvLyBJbiBkZXYsIHVzZSAvYXBpLWFkbWluIHRvIGF2b2lkIENPUlMgd2hlbiB1cGxvYWRpbmcgdG8gYWRtaW4gQVBJXHJcbiAgICAgIFwiL2FwaS1hZG1pblwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vc3VwZXJhZG1pbmFwaS52aWxsYWdrYXJ0LmNvbVwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS1hZG1pbi8sIFwiL2FwaS92MVwiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1gsU0FBUyxvQkFBb0I7QUFDNVosT0FBTyxXQUFXO0FBRWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUE7QUFBQSxNQUVMLGNBQWM7QUFBQSxRQUNaLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxnQkFBZ0IsU0FBUztBQUFBLE1BQzNEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
