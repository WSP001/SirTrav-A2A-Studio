import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path aliases - clean imports like Next.js
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@/components": resolve(__dirname, "src/components"),
      "@/remotion": resolve(__dirname, "src/remotion"),
      "@/lib": resolve(__dirname, "src/lib"),
      "@/hooks": resolve(__dirname, "src/hooks"),
      "@/types": resolve(__dirname, "src/types"),
    },
  },

  // Build optimizations
  build: {
    outDir: "landing", // Output directly to landing for Netlify
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          react: ["react", "react-dom"],
          remotion: ["remotion", "@remotion/cli"],
        },
      },
    },
  },

  // Dev server settings
  server: {
    port: 3000,
    strictPort: false,
    open: false, // Don't auto-open (netlify dev handles this)
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
    exclude: ["remotion"], // Let Remotion bundle itself
  },
});

