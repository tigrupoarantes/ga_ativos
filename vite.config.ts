import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const n = id.replace(/\\/g, "/");

          if (
            n.includes("node_modules/react/") ||
            n.includes("node_modules/react-dom/") ||
            n.includes("node_modules/react-router-dom/") ||
            n.includes("node_modules/@remix-run/")
          ) return "vendor-react";

          if (n.includes("node_modules/@supabase/")) return "vendor-supabase";
          if (n.includes("node_modules/@tanstack/")) return "vendor-query";

          // recharts + sub-pacotes d3 (peer deps internos) + victory-vendor
          if (
            n.includes("node_modules/recharts/") ||
            n.includes("node_modules/d3-") ||
            n.includes("node_modules/victory-vendor/")
          ) return "vendor-charts";

          // react-markdown + ecossistema remark/rehype/unified (lazy nos chats de IA)
          if (
            n.includes("node_modules/react-markdown") ||
            n.includes("node_modules/remark") ||
            n.includes("node_modules/rehype") ||
            n.includes("node_modules/unified") ||
            n.includes("node_modules/mdast") ||
            n.includes("node_modules/micromark") ||
            n.includes("node_modules/hast") ||
            n.includes("node_modules/vfile") ||
            n.includes("node_modules/unist")
          ) return "vendor-markdown";

          // read-excel-file isolado — carregado via dynamic import em excel.ts
          if (n.includes("node_modules/read-excel-file")) return "vendor-excel";

          if (
            n.includes("node_modules/@radix-ui/") ||
            n.includes("node_modules/cmdk/") ||
            n.includes("node_modules/vaul/") ||
            n.includes("node_modules/clsx/") ||
            n.includes("node_modules/class-variance-authority/") ||
            n.includes("node_modules/tailwind-merge/") ||
            n.includes("node_modules/next-themes/") ||
            n.includes("node_modules/embla-carousel")
          ) return "vendor-ui";

          if (
            n.includes("node_modules/react-hook-form/") ||
            n.includes("node_modules/@hookform/") ||
            n.includes("node_modules/zod/")
          ) return "vendor-forms";

          // tudo mais (date-fns, lucide-react, sonner, etc.)
          if (n.includes("node_modules/")) return "vendor-misc";
        },
      },
    },
  },
}));
