import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      '/supabase-proxy': {
        target: 'https://ccyqzcaghwaggtmkmigi.supabase.co',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, '')
      }
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),
    // Brotli compression (better than gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    // Bundle analyzer - only in analyze mode
    mode === 'analyze' && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Optimized manual chunks for better caching
        manualChunks: (id) => {
          // Node modules chunking
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI library
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Charts
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            // React Query
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Framer Motion
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // Other node_modules
            return 'vendor';
          }

          // Dashboard-specific chunks (lazy loaded via routes)
          if (id.includes('/pages/student/')) {
            return 'dashboard-student';
          }
          if (id.includes('/pages/faculty/')) {
            return 'dashboard-faculty';
          }
          if (id.includes('/pages/institution/')) {
            return 'dashboard-institution';
          }
          if (id.includes('/pages/admin/')) {
            return 'dashboard-admin';
          }
          if (id.includes('/pages/parent/')) {
            return 'dashboard-parent';
          }
          if (id.includes('/pages/accountant/')) {
            return 'dashboard-accountant';
          }
          if (id.includes('/pages/canteen/')) {
            return 'dashboard-canteen';
          }

          // Common components
          if (id.includes('/components/common/') || id.includes('/components/ui/')) {
            return 'components-common';
          }
          if (id.includes('/components/')) {
            return 'components';
          }

          // Hooks
          if (id.includes('/hooks/')) {
            return 'hooks';
          }

          // Utils and services
          if (id.includes('/utils/') || id.includes('/services/')) {
            return 'utils';
          }
        },
        // Asset file naming - include hash for cache busting
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 600, // Warn if chunk > 600KB
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : [],
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // Source maps for debugging (disable in production for smaller builds)
    sourcemap: mode === 'development',
    // CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  // Performance optimizations
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Tree shaking
    treeShaking: true,
  },
}));
