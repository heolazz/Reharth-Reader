import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png'],
        manifest: {
          name: 'Reharth Reader',
          short_name: 'Reharth',
          description: 'Minimalist Book Reader and Library',
          theme_color: '#FAFAFA',
          background_color: '#FAFAFA',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'logo.png',
              sizes: '192x192 512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'logo.png',
              sizes: '192x192 512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit since we might load EPUBs
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff,woff2,ttf,eot}']
        },
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
