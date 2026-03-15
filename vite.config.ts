import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────
// Windows EPERM fix: vite-plugin-pwa builds sw.mjs then tries
// to rename it to sw.js. On Windows, antivirus/file locks can
// block that rename. This plugin retries the rename manually.
// ─────────────────────────────────────────────────────────────
function swRenameFixPlugin() {
  return {
    name: "sw-rename-fix",
    closeBundle: {
      sequential: true,
      order: "post" as const,
      async handler() {
        const outDir = path.resolve(process.cwd(), "dist", "public");
        const mjs = path.join(outDir, "sw.mjs");
        const js = path.join(outDir, "sw.js");

        if (!fs.existsSync(mjs)) return; // nothing to do

        // Retry up to 10 times with a short delay (gives antivirus time to release)
        for (let i = 0; i < 10; i++) {
          try {
            await fs.promises.rename(mjs, js);
            console.log("[sw-rename-fix] sw.mjs → sw.js ✓");
            return;
          } catch (err: any) {
            if (err.code === "EPERM" && i < 9) {
              await new Promise((r) => setTimeout(r, 300));
            } else {
              // Last resort: copy + delete
              try {
                await fs.promises.copyFile(mjs, js);
                await fs.promises.unlink(mjs);
                console.log("[sw-rename-fix] sw.mjs → sw.js (copy+delete fallback) ✓");
                return;
              } catch (copyErr) {
                throw copyErr;
              }
            }
          }
        }
      },
    },
  };
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',

      outDir: path.resolve(process.cwd(), "dist", "public"),

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        globIgnores: ['**/node_modules/**', '**/*.map'],
        // Raised to 5 MB to cover the 3.29 MB index chunk
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },

      manifest: {
        name: 'FiscalStack POS',
        short_name: 'FiscalStack',
        description: 'POS',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/pos',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/fiscalstack-logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/fiscalstack-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
    // Must come AFTER VitePWA so it runs after the SW is built
    swRenameFixPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "client"),
  build: {
    outDir: path.resolve(process.cwd(), "dist", "public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "framer-motion", "wouter"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-select"],
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});