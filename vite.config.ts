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
          // Core vendor libraries - keep React together to avoid circular deps
          if (id.includes('node_modules')) {
            // Keep all React-related packages together
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor';
            }

            // Supabase and auth
            if (id.includes('@supabase') || id.includes('jose') || id.includes('whatwg-url')) {
              return 'supabase';
            }

            // UI libraries
            if (
              id.includes('@radix-ui') ||
              id.includes('class-variance-authority') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'ui';
            }

            // Charts and visualization
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }

            // Other large libraries
            if (id.includes('date-fns') || id.includes('lucide-react')) {
              return 'utils';
            }

            // Everything else goes to vendor
            return 'vendor';
          }

          // Application code splitting by route
          if (id.includes('/src/pages/')) {
            if (id.includes('/admin/')) return 'admin';
            if (id.includes('/institution/')) return 'institution';
            if (id.includes('/faculty/')) return 'faculty';
            if (id.includes('/student/')) return 'student';
            if (id.includes('/parent/')) return 'parent';
          }

          // Common components
          if (id.includes('/src/components/')) {
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
    // Module preload for faster initial load
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // Preload critical chunks
        return deps.filter(dep => {
          // Always preload vendor and UI chunks
          return dep.includes('vendor') || dep.includes('ui') || dep.includes('supabase');
        });
      },
    },
  },
  // Performance optimizations
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Tree shaking
    treeShaking: true,
  },
}));
