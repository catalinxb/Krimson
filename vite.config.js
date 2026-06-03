import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  // Use VITE_SERVER_URL for LAN setup, default to localhost
  const serverUrl = env.VITE_SERVER_URL || 'http://localhost:3001'
  const wsUrl = serverUrl.replace('http', 'ws')

  // Safely extract the production environment port mapped by Railway
  const productionPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Allow connections from other machines on the network
      host: env.VITE_HOST || '0.0.0.0',
      port: parseInt(env.VITE_PORT, 10) || 5173,
      hmr: false, // DISABLED - causes refresh loop
      proxy: {
        '/api': {
          target: serverUrl,
          changeOrigin: true,
          secure: false,
        },
        '/graphql': {
          target: serverUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: productionPort,
      strictPort: true,
      allowedHosts: ['.railway.app', '.vercel.app', '.render.com', 'krimson-frontend.vercel.app']
    },
    build: {
      minify: 'terser',
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor';
            }
            if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react') || id.includes('node_modules/recharts')) {
              return 'ui';
            }
          }
        }
      },
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: true
        }
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
      exclude: ['**/node_modules/**', 'dist', '.git', 'coverage', 'e2e/**'],
      coverage: {
        all: true,
        include: ['src/**/*.{js,jsx,ts,tsx}'],
        exclude: ['**/node_modules/**', 'dist', '.git', 'coverage', 'e2e/**'],
        reporter: ['text', 'lcov'],
      },
    },
  }
})