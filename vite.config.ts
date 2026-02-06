import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE || '';
  const target = apiBase.replace(/\/+$/, '');

  return {
    base: './',
    plugins: [react()],
    server: {
      proxy: target
        ? {
            '/api': {
              target,
              changeOrigin: true,
              secure: false,
              followRedirects: true,
              rewrite: (path) => path.replace(/^\/api/, '')
            }
          }
        : undefined
    }
  };
});
